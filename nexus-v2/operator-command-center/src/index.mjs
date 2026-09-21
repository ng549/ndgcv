import { ACTIONS, GLOBAL_ACTIONS, isSameOriginWrite, normalizePacket, unknownWorker } from "./core.mjs";
import { deriveControls, deriveGlobalControls, CONTRACT_VERSION } from "./capability.mjs";
import { OrchestratorError, listPackets, sendWorkerCommand, runAllReady, runPhase } from "./adapter.mjs";
import { renderPage } from "./ui.mjs";

const SEED_WORKERS = [
  ["1", "Control Tower", "nexus-v2-p1-01-control-tower"],
  ["2", "Open-Source, MCP & Reuse Scout", "nexus-v2-p1-02-reuse-scout"],
  ["7", "Integration & Data Connectivity", "nexus-v2-p1-07-integrations"],
  ["8", "AI Gateway", "nexus-v2-p1-08-ai-gateway"],
  ["9", "Build Orchestration", "nexus-v2-p1-09-build-orchestration"],
  ["12", "V1 Migration Audit", "nexus-v2-p1-12-old-nexus-audit"],
  ["13", "Nicolas Command & Control", "nexus-v2-p1-13-operator-command-center"]
];

const enc = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function b64urlToBytes(value) {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Uint8Array.from(atob(s + pad), c => c.charCodeAt(0));
}

function decodePart(value) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(value)));
}

async function verifyAccessJwt(token, env) {
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.OPERATOR_EMAIL) throw new Error("AUTH_REQUIRED");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("AUTH_REQUIRED");
  const [h, p, s] = parts;
  const header = decodePart(h);
  const payload = decodePart(p);
  if (header.alg !== "RS256" || !header.kid) throw new Error("AUTH_REQUIRED");

  const host = env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const certs = await fetch("https://" + host + "/cdn-cgi/access/certs", { cf: { cacheTtl: 300 } });
  if (!certs.ok) throw new Error("AUTH_REQUIRED");
  const jwk = ((await certs.json()).keys || []).find(k => k.kid === header.kid);
  if (!jwk) throw new Error("AUTH_REQUIRED");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), enc.encode(h + "." + p))) throw new Error("AUTH_REQUIRED");

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== "https://" + host || !payload.exp || payload.exp <= now || !aud.includes(env.ACCESS_AUD)) throw new Error("AUTH_REQUIRED");
  if (!payload.email) throw new Error("AUTH_REQUIRED");
  return payload;
}

async function authenticate(request, env) {
  const claims = await verifyAccessJwt(request.headers.get("Cf-Access-Jwt-Assertion") || "", env);
  const email = String(claims.email).toLowerCase();
  if (email !== String(env.OPERATOR_EMAIL).toLowerCase()) {
    const err = new Error("FORBIDDEN");
    err.status = 403;
    throw err;
  }
  if (!env.OPERATOR_RATE_LIMITER) {
    const err = new Error("RATE_LIMIT_UNAVAILABLE");
    err.status = 503;
    throw err;
  }
  const limited = await env.OPERATOR_RATE_LIMITER.limit({ key: email });
  if (!limited.success) {
    const err = new Error("RATE_LIMITED");
    err.status = 429;
    throw err;
  }
  return { email, sub: claims.sub || null };
}

function reasonFromError(error) {
  if (error instanceof OrchestratorError) {
    if (error.code === "HTTP_ERROR") return "HTTP_" + (error.httpStatus || "UNKNOWN");
    return error.code; // NOT_CONFIGURED | TIMEOUT | UNAVAILABLE | AUTH_REJECTED | INVALID_PAYLOAD
  }
  return "UNAVAILABLE";
}

async function getWorkerState(env) {
  const seeds = SEED_WORKERS.map(([id, name, branch]) => unknownWorker(id, name, branch));
  const emptyGlobal = () => ({
    RUN_ALL_READY: { allowed: false, reason: "not_connected" },
    RUN_PHASE: { allowed: false, reason: "not_connected" }
  });

  try {
    const { packets, observedAt } = await listPackets(env);
    const byId = new Map(packets.map(p => [String(p.worker_id ?? p.id), normalizePacket(p)]));
    const workers = SEED_WORKERS.map(([id, name, branch]) => {
      const live = byId.get(id);
      const view = live || unknownWorker(id, name, branch);
      if (live) {
        if (!view.name || view.name === "Worker " + id) view.name = name;
        if (!view.branch) view.branch = branch;
      }
      view.controls = deriveControls(view);
      return view;
    });
    // Do not silently drop live workers outside the seed list (finding F7):
    // an unseeded packet is still real evidence and must render.
    for (const [id, view] of byId) {
      if (!SEED_WORKERS.some(([seedId]) => seedId === id)) {
        view.controls = deriveControls(view);
        workers.push(view);
      }
    }
    return {
      connected: true,
      reason: null,
      observedAt: observedAt || new Date().toISOString(),
      contractVersion: CONTRACT_VERSION,
      capabilitySource: "derived-from-" + CONTRACT_VERSION,
      workers,
      globalControls: deriveGlobalControls(true, workers)
    };
  } catch (error) {
    const reason = reasonFromError(error);
    return {
      connected: false,
      reason,
      observedAt: null,
      contractVersion: CONTRACT_VERSION,
      capabilitySource: "derived-from-" + CONTRACT_VERSION,
      workers: seeds,
      globalControls: emptyGlobal()
    };
  }
}

async function audit(env, event) {
  if (!env.AUDIT_DB) throw new Error("AUDIT_UNAVAILABLE");
  const id = crypto.randomUUID();
  await env.AUDIT_DB.prepare(
    "INSERT INTO operator_audit (id, occurred_at, actor_email, action, worker_id, request_id, outcome, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, new Date().toISOString(), event.actor, event.action, event.workerId || null,
    event.requestId, event.outcome, JSON.stringify(event.detail || {})
  ).run();
  console.log(JSON.stringify({ type: "operator_audit", id, ...event }));
}

function buildPayload(action, body) {
  if (action === "REASSIGN_MODEL") {
    const model = String(body.model || "").trim();
    if (!model) return { error: "MODEL_REQUIRED" };
    if (model.length > 128) return { error: "MODEL_TOO_LONG" };
    return { payload: { model } };
  }
  if (action === "ADJUST_BUDGET") {
    if (!Number.isSafeInteger(body.budgetLimitMicros) || body.budgetLimitMicros < 0) {
      return { error: "INVALID_BUDGET_LIMIT_MICROS" };
    }
    return { payload: { budgetLimitMicros: body.budgetLimitMicros } };
  }
  return { payload: {} };
}

async function commandWorker(request, env, actor, workerId) {
  if (!isSameOriginWrite(request)) return json({ error: "INVALID_WRITE_ORIGIN" }, 403);
  if (!env.AUDIT_DB) return json({ error: "AUDIT_UNAVAILABLE", controls_disabled: true }, 503);

  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();
  if (!ACTIONS.includes(action)) return json({ error: "INVALID_ACTION" }, 400);

  const built = buildPayload(action, body);
  if (built.error) return json({ error: built.error }, 400);

  const state = await getWorkerState(env);
  const worker = state.workers.find(w => w.id === String(workerId));
  const control = worker && worker.controls ? worker.controls[action] : null;
  if (!state.connected || !worker || !control || control.allowed !== true) {
    const reason = !state.connected
      ? "not_connected:" + state.reason
      : (control && control.reason) || "unsupported_or_unverified";
    await audit(env, { actor: actor.email, action, workerId, requestId, outcome: "DENIED", detail: { reason } });
    return json({ error: "ACTION_NOT_AVAILABLE", reason, status: worker ? worker.status : "UNKNOWN" }, 409);
  }

  await audit(env, { actor: actor.email, action, workerId, requestId, outcome: "REQUESTED", detail: { payload: built.payload } });
  try {
    const result = await sendWorkerCommand(env, workerId, action, built.payload, requestId, actor.email);
    await audit(env, { actor: actor.email, action, workerId, requestId, outcome: "ACCEPTED", detail: { upstream_status: result.upstreamStatus ?? null, command_id: result.commandId ?? null } });
    return json({ accepted: true, request_id: requestId, upstream_status: result.upstreamStatus ?? null, command_id: result.commandId ?? null }, 202);
  } catch (error) {
    const reason = reasonFromError(error);
    // A timeout means Worker 9 may still have accepted and be processing the
    // command; auditing that as REJECTED would misstate reality.
    const outcome = error.code === "TIMEOUT" ? "TIMEOUT_UNKNOWN" : "REJECTED";
    await audit(env, { actor: actor.email, action, workerId, requestId, outcome, detail: { reason, upstream_status: error.httpStatus || null } });
    return json({ accepted: false, request_id: requestId, upstream_status: error.httpStatus || null, command_id: null, reason }, 502);
  }
}

async function commandGlobal(request, env, actor) {
  if (!isSameOriginWrite(request)) return json({ error: "INVALID_WRITE_ORIGIN" }, 403);
  if (!env.AUDIT_DB) return json({ error: "AUDIT_UNAVAILABLE", controls_disabled: true }, 503);

  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();
  if (!GLOBAL_ACTIONS.includes(action)) return json({ error: "INVALID_GLOBAL_ACTION" }, 400);
  if (action === "RUN_PHASE" && !String(body.phase || "").trim()) return json({ error: "PHASE_REQUIRED" }, 400);

  const state = await getWorkerState(env);
  const control = state.globalControls[action];
  if (!state.connected || !control || control.allowed !== true) {
    const reason = !state.connected ? "not_connected:" + state.reason : (control && control.reason) || "unsupported_or_unverified";
    await audit(env, { actor: actor.email, action, requestId, outcome: "DENIED", detail: { reason } });
    return json({ error: "GLOBAL_ACTION_NOT_AVAILABLE", reason }, 409);
  }

  await audit(env, { actor: actor.email, action, requestId, outcome: "REQUESTED", detail: { phase: body.phase || null } });
  try {
    const result = action === "RUN_ALL_READY"
      ? await runAllReady(env, requestId)
      : await runPhase(env, String(body.phase).trim(), requestId);
    await audit(env, { actor: actor.email, action, requestId, outcome: "ACCEPTED", detail: { upstream_status: result.upstreamStatus ?? null, command_id: result.commandId ?? null } });
    return json({ accepted: true, request_id: requestId, upstream_status: result.upstreamStatus ?? null, command_id: result.commandId ?? null }, 202);
  } catch (error) {
    const reason = reasonFromError(error);
    // TIMEOUT_UNKNOWN: a bulk run may be partially accepted upstream.
    const outcome = error.code === "TIMEOUT" ? "TIMEOUT_UNKNOWN" : "REJECTED";
    await audit(env, { actor: actor.email, action, requestId, outcome, detail: { reason, upstream_status: error.httpStatus || null } });
    return json({ accepted: false, request_id: requestId, upstream_status: error.httpStatus || null, command_id: null, reason }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/operator")) return new Response("Not found", { status: 404 });

    let actor;
    try {
      actor = await authenticate(request, env);
    } catch (error) {
      // Only machine codes leave this boundary; raw parser messages can echo
      // fragments of the attacker-supplied token.
      const safeDetail = /^[A-Z_]+$/.test(String(error.message || "")) ? error.message : "auth_failed";
      return json({ error: error.status === 403 ? "FORBIDDEN" : "AUTH_REQUIRED", detail: safeDetail }, error.status || 401);
    }

    if (request.method === "GET" && (url.pathname === "/operator" || url.pathname === "/operator/")) {
      const model = await getWorkerState(env);
      return new Response(renderPage(model), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-frame-options": "DENY",
          "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff"
        }
      });
    }
    if (request.method === "GET" && url.pathname === "/operator/api/workers") return json(await getWorkerState(env));
    const m = url.pathname.match(/^\/operator\/api\/workers\/([^/]+)\/command$/);
    if (request.method === "POST" && m) return commandWorker(request, env, actor, decodeURIComponent(m[1]));
    if (request.method === "POST" && url.pathname === "/operator/api/global") return commandGlobal(request, env, actor);
    return json({ error: "NOT_FOUND" }, 404);
  }
};
