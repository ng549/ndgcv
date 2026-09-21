// src/adapter.mjs — server-side adapter to Worker 9's REAL HTTP API
// (nexus-v2/worker-supervisor/src/index.mjs):
//   GET  /api/workers
//   POST /api/workers/:id/commands        body { command, payload }
//   POST /api/run-all-ready
//   POST /api/run-phase/:phase
//
// The ORCHESTRATOR_TOKEN never leaves the server side. Error taxonomy is
// first-class so the UI can distinguish "not configured", "unreachable",
// "auth rejected", "http error", and "payload we cannot trust" instead of
// fabricating a connected state. Workers-compatible fetch API only.

export const ERROR_CODES = Object.freeze([
  "NOT_CONFIGURED", "TIMEOUT", "UNAVAILABLE",
  "AUTH_REJECTED", "HTTP_ERROR", "INVALID_PAYLOAD"
]);

export class OrchestratorError extends Error {
  constructor(code, message, httpStatus = null) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const TIMEOUT_MS = 5000;

function requireConfig(env) {
  const baseUrl = env?.ORCHESTRATOR_BASE_URL;
  const token = env?.ORCHESTRATOR_TOKEN;
  if (!baseUrl || !token) {
    throw new OrchestratorError(
      "NOT_CONFIGURED",
      "ORCHESTRATOR_BASE_URL and ORCHESTRATOR_TOKEN are required"
    );
  }
  return { baseUrl, token };
}

async function orchestratorFetch(env, path, { method = "GET", body, requestId } = {}) {
  const { baseUrl, token } = requireConfig(env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/json"
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (requestId) headers["x-idempotency-key"] = String(requestId);

  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) {
      throw new OrchestratorError("TIMEOUT", `Orchestrator request timed out after ${TIMEOUT_MS}ms`);
    }
    throw new OrchestratorError("UNAVAILABLE", `Orchestrator unreachable: ${error?.message || error}`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    throw new OrchestratorError("AUTH_REJECTED", `Orchestrator rejected credentials (${response.status})`, response.status);
  }
  if (!response.ok) {
    throw new OrchestratorError("HTTP_ERROR", `Orchestrator returned HTTP ${response.status}`, response.status);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new OrchestratorError("INVALID_PAYLOAD", "Orchestrator response was not valid JSON");
  }
  return data;
}

// camelCase operator payload -> Worker 9 snake_case wire format (contract v1).
function toWirePayload(command, payload = {}) {
  const wire = {};
  if (payload && typeof payload === "object") {
    for (const [key, value] of Object.entries(payload)) {
      if (key === "budgetLimitMicros") wire.budget_limit_micros = value;
      else wire[key] = value; // "model" stays "model"; other keys pass through
    }
  }
  return wire;
}

function assertPacketShape(packet) {
  if (!packet || typeof packet !== "object" ||
      typeof packet.worker_id !== "string" || packet.worker_id.length === 0 ||
      typeof packet.state !== "string" || packet.state.length === 0) {
    throw new OrchestratorError(
      "INVALID_PAYLOAD",
      "Worker packet missing required keys (worker_id, state)"
    );
  }
}

export async function listPackets(env) {
  const data = await orchestratorFetch(env, "/api/workers");
  if (!data || typeof data !== "object" || !Array.isArray(data.workers)) {
    throw new OrchestratorError("INVALID_PAYLOAD", "List-workers response lacks a workers array");
  }
  for (const packet of data.workers) assertPacketShape(packet);
  return { packets: data.workers, observedAt: new Date().toISOString() };
}

export async function sendWorkerCommand(env, workerId, command, payload = {}, requestId, requestedBy = null) {
  if (typeof workerId !== "string" || workerId.length === 0) {
    throw new OrchestratorError("INVALID_PAYLOAD", "workerId is required");
  }
  // requested_by/request_id travel in the body for forward compatibility:
  // Worker 9 (72389be) ignores them today; the Worker 9 auth handoff proposes
  // persisting them so its event log can attribute the operator (CT invariant).
  return orchestratorFetch(env, `/api/workers/${encodeURIComponent(workerId)}/commands`, {
    method: "POST",
    requestId,
    body: {
      command,
      payload: toWirePayload(command, payload),
      ...(requestedBy ? { requested_by: requestedBy } : {}),
      ...(requestId ? { request_id: requestId } : {})
    }
  });
}

export async function runAllReady(env, requestId) {
  return orchestratorFetch(env, "/api/run-all-ready", { method: "POST", requestId, body: {} });
}

export async function runPhase(env, phase, requestId) {
  if (typeof phase !== "string" || phase.trim().length === 0) {
    throw new OrchestratorError("INVALID_PAYLOAD", "phase is required");
  }
  return orchestratorFetch(env, `/api/run-phase/${encodeURIComponent(phase.trim())}`, {
    method: "POST",
    requestId,
    body: {}
  });
}
