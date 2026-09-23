import {
  commandTransition, makeIdempotencyKey, nextStateAfterExecution,
  readyPackets, readyPhasePackets, validateLaunch, chooseModel, SupervisorError
} from "./core.mjs";
import { authorizeWorker9Request } from "./auth.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8" }
});

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    allowed_files: JSON.parse(row.allowed_files_json || "[]"),
    context_refs: JSON.parse(row.context_refs_json || "[]"),
    acceptance_criteria: JSON.parse(row.acceptance_criteria_json || "[]"),
    dependencies: JSON.parse(row.dependencies_json || "[]"),
    fallback_models: JSON.parse(row.fallback_models_json || "[]"),
    blocker: row.blocker_json ? JSON.parse(row.blocker_json) : null
  };
}

async function listPackets(env) {
  const { results = [] } = await env.DB.prepare("SELECT * FROM work_packets ORDER BY worker_id").all();
  return results.map(parseRow);
}

async function getPacket(env, workerId) {
  return parseRow(await env.DB.prepare("SELECT * FROM work_packets WHERE worker_id=?").bind(workerId).first());
}

async function saveMutablePacket(env, packet) {
  await env.DB.prepare(`UPDATE work_packets SET
    preferred_model=?, budget_limit_micros=?, state=?, blocker_json=?, review_state=?,
    retry_count=?, packet_version=?, updated_at=?
    WHERE worker_id=?`).bind(
      packet.preferred_model ?? null,
      packet.budget_limit_micros,
      packet.state,
      packet.blocker ? JSON.stringify(packet.blocker) : null,
      packet.review_state || "NOT_SENT",
      packet.retry_count || 0,
      packet.packet_version || 1,
      new Date().toISOString(),
      packet.worker_id
    ).run();
}

async function audit(env, workerId, executionId, eventType, detail = {}) {
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO supervisor_events
    (event_id,worker_id,execution_id,occurred_at,event_type,detail_json)
    VALUES(?,?,?,?,?,?)`).bind(
      id, workerId, executionId ?? null, new Date().toISOString(), eventType, JSON.stringify(detail)
    ).run();
}

async function acquireExecution(env, packet, model) {
  const executionId = makeIdempotencyKey(packet);
  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO supervisor_executions
        (execution_id,worker_id,idempotency_key,model_route,state,started_at,heartbeat_at)
        VALUES(?,?,?,?,?,?,?)`).bind(executionId, packet.worker_id, executionId, model, "RUNNING", now, now),
      env.DB.prepare(`UPDATE work_packets SET state='RUNNING',active_execution_id=?,
        heartbeat_at=?,lease_expires_at=?,updated_at=? WHERE worker_id=? AND state IN ('READY','FAILED','STOPPED')`)
        .bind(executionId, now, new Date(Date.now()+10*60*1000).toISOString(), now, packet.worker_id)
    ]);
    return executionId;
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) {
      throw new SupervisorError("DUPLICATE_EXECUTION", "Execution already exists", { execution_id: executionId });
    }
    throw error;
  }
}

async function launchGateway(env, packet, executionId, model) {
  if (!env.AI_GATEWAY_URL) {
    throw new SupervisorError("GATEWAY_UNAVAILABLE", "AI_GATEWAY_URL is not configured");
  }
  const response = await fetch(new URL("/v1/worker-executions", env.AI_GATEWAY_URL), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.AI_GATEWAY_TOKEN ? { authorization: `Bearer ${env.AI_GATEWAY_TOKEN}` } : {})
    },
    body: JSON.stringify({
      request_id: executionId,
      idempotency_key: executionId,
      worker_id: packet.worker_id,
      capability: "coding",
      preferred_model: model,
      budget_remaining_micros: packet.budget_limit_micros - packet.budget_consumed_micros,
      branch: packet.branch,
      allowed_files: packet.allowed_files,
      context_refs: packet.context_refs,
      acceptance_criteria: packet.acceptance_criteria,
      checkpoint_sha: packet.checkpoint_sha,
      canonical_sha: packet.canonical_sha
    })
  });
  if (!response.ok) throw new SupervisorError("GATEWAY_ERROR", `Gateway returned ${response.status}`);
  return response.json();
}

async function runOne(env, workerId) {
  const allPackets = await listPackets(env);
  const packet = allPackets.find(p => p.worker_id === workerId);
  if (!packet) throw new SupervisorError("NOT_FOUND", "Worker packet not found");
  const canonical = await env.CANONICAL.get("current_sha");
  validateLaunch(packet, { allPackets, currentCanonicalSha: canonical });
  const routeHealth = env.ROUTE_HEALTH ? JSON.parse(await env.ROUTE_HEALTH.get("models") || "{}") : {};
  const model = chooseModel(packet, routeHealth);
  const executionId = await acquireExecution(env, packet, model);
  await audit(env, workerId, executionId, "EXECUTION_STARTED", { model });

  try {
    const result = await launchGateway(env, packet, executionId, model);
    const transition = nextStateAfterExecution(packet, result);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`UPDATE supervisor_executions SET state=?,ended_at=?,checkpoint_sha=?,
        acceptance_claim_json=? WHERE execution_id=?`).bind(
          transition.state, now, result.checkpoint_sha || packet.checkpoint_sha || null,
          JSON.stringify(result.acceptance || null), executionId
        ),
      env.DB.prepare(`UPDATE work_packets SET state=?,checkpoint_sha=?,retry_count=?,
        blocker_json=?,active_execution_id=NULL,lease_expires_at=NULL,heartbeat_at=?,updated_at=?
        WHERE worker_id=?`).bind(
          transition.state, result.checkpoint_sha || packet.checkpoint_sha || null,
          transition.retry_count ?? packet.retry_count ?? 0,
          transition.blocker ? JSON.stringify(transition.blocker) : null,
          now, now, workerId
        )
    ]);
    await audit(env, workerId, executionId, "EXECUTION_FINISHED", transition);
    if (transition.state === "READY" && env.SUPERVISOR_QUEUE) {
      await env.SUPERVISOR_QUEUE.send({ worker_id: workerId, reason: "auto_continue" });
    }
    return { worker_id: workerId, execution_id: executionId, model, ...transition };
  } catch (error) {
    const now = new Date().toISOString();
    const retries = (packet.retry_count || 0) + 1;
    const state = retries >= (packet.max_retries || 3) ? "BLOCKED" : "FAILED";
    await env.DB.batch([
      env.DB.prepare("UPDATE supervisor_executions SET state=?,ended_at=?,error_code=?,error_detail=? WHERE execution_id=?")
        .bind(state, now, error.code || "EXECUTION_ERROR", String(error.message || error), executionId),
      env.DB.prepare(`UPDATE work_packets SET state=?,retry_count=?,active_execution_id=NULL,
        lease_expires_at=NULL,blocker_json=?,updated_at=? WHERE worker_id=?`).bind(
          state, retries, state === "BLOCKED" ? JSON.stringify({ code: "REPEATED_FAILURE", message: String(error.message || error) }) : null,
          now, workerId
        )
    ]);
    await audit(env, workerId, executionId, "EXECUTION_FAILED", { code: error.code, message: error.message, retries });
    if (state === "FAILED" && env.SUPERVISOR_QUEUE) {
      await env.SUPERVISOR_QUEUE.send({ worker_id: workerId, reason: "retry" }, { delaySeconds: Math.min(300, 2 ** retries * 5) });
    }
    throw error;
  }
}

async function handleCommand(env, workerId, command, payload) {
  const packet = await getPacket(env, workerId);
  if (!packet) throw new SupervisorError("NOT_FOUND", "Worker packet not found");
  if (["RUN","CONTINUE"].includes(command)) {
    if (env.SUPERVISOR_QUEUE) {
      await env.SUPERVISOR_QUEUE.send({ worker_id: workerId, reason: command.toLowerCase() });
      await audit(env, workerId, null, command, payload);
      return { accepted: true, queued: true };
    }
    return { accepted: true, queued: false, result: await runOne(env, workerId) };
  }
  const updated = commandTransition(packet, command, payload);
  await saveMutablePacket(env, updated);
  await audit(env, workerId, null, command, payload);
  return { accepted: true, worker: updated };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      // Auth gate per Factory Test #6 handoff proposal (WORKER-9-AUTH-PROPOSAL.md):
      // all /api/* routes require a Bearer SUPERVISOR_TOKEN when the secret is set.
      if (url.pathname.startsWith("/api/")) {
        const authz = await authorizeWorker9Request(request, env);
        if (!authz.ok) {
          try {
            await audit(env, "(unauthenticated)", null, "AUTH_REJECTED", { code: authz.code });
          } catch (auditError) {
            // The rejection response must never depend on the audit write.
            console.warn("[worker-supervisor] AUTH_REJECTED audit write failed", String(auditError));
          }
          return json({ error: authz.code }, authz.status);
        }
        if (authz.warning === "TOKEN_UNSET") {
          console.warn("[worker-supervisor] SUPERVISOR_TOKEN is NOT set — all /api/* routes are UNAUTHENTICATED (pre-production only)");
        }
      }
      if (request.method === "GET" && url.pathname === "/api/workers") {
        return json({ workers: await listPackets(env) });
      }
      if (request.method === "POST" && url.pathname === "/api/run-all-ready") {
        const packets = await listPackets(env);
        const ready = readyPackets(packets);
        for (const packet of ready) await env.SUPERVISOR_QUEUE.send({ worker_id: packet.worker_id, reason: "run_all_ready" });
        return json({ accepted: ready.map(p => p.worker_id) }, 202);
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/run-phase/")) {
        const phase = decodeURIComponent(url.pathname.split("/").pop());
        const packets = readyPhasePackets(await listPackets(env), phase);
        for (const packet of packets) await env.SUPERVISOR_QUEUE.send({ worker_id: packet.worker_id, reason: "run_phase" });
        return json({ phase, accepted: packets.map(p => p.worker_id) }, 202);
      }
      const match = url.pathname.match(/^\/api\/workers\/([^/]+)\/commands$/);
      if (request.method === "POST" && match) {
        const { command, payload = {} } = await request.json();
        return json(await handleCommand(env, decodeURIComponent(match[1]), command, payload), 202);
      }
      return json({ error: "not_found" }, 404);
    } catch (error) {
      const status = error.code === "NOT_FOUND" ? 404 : 409;
      return json({ error: error.code || "internal_error", message: error.message, detail: error.detail || {} }, status);
    }
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await runOne(env, message.body.worker_id);
        message.ack();
      } catch (error) {
        if (["STALE_CANONICAL","BUDGET_EXHAUSTED","DEPENDENCY_NOT_READY","WRITE_CONFLICT","RETRY_LIMIT","NO_QUALIFIED_MODEL"].includes(error.code)) {
          await audit(env, message.body.worker_id, null, "LAUNCH_BLOCKED", { code: error.code, detail: error.detail });
          message.ack();
        } else {
          message.retry({ delaySeconds: 30 });
        }
      }
    }
  }
};
