export const STATUS = Object.freeze([
  "RUNNING", "READY", "WAITING_ON_DEPENDENCY", "BLOCKED", "NEEDS_REVIEW",
  "FAILED", "STOPPED", "PAUSED", "COMPLETE", "UNKNOWN"
]);

export const ACTIONS = Object.freeze([
  "RUN", "CONTINUE", "PAUSE", "RESUME", "STOP", "RETRY",
  "REASSIGN_MODEL", "ADJUST_BUDGET", "SEND_TO_REVIEW"
]);

export const GLOBAL_ACTIONS = Object.freeze(["RUN_ALL_READY", "RUN_PHASE"]);

// Matches capability.mjs / Worker 9 lease duration. Duplicated locally to avoid
// cross-imports (core must stay dependency-free).
export const HEARTBEAT_STALE_MS = 10 * 60 * 1000;

export function normalizeStatus(value) {
  const candidate = String(value || "").trim().toUpperCase().replace(/[ -]+/g, "_");
  return STATUS.includes(candidate) ? candidate : "UNKNOWN";
}

function heartbeatIsFresh(lastHeartbeat, now) {
  if (!lastHeartbeat) return false;
  const ts = Date.parse(lastHeartbeat);
  if (!Number.isFinite(ts)) return false;
  return now - ts <= HEARTBEAT_STALE_MS;
}

function normalizeBlocker(blocker) {
  if (blocker === null || blocker === undefined) return null;
  if (typeof blocker === "string") return blocker;
  if (typeof blocker === "object") {
    return blocker.message || blocker.code || null;
  }
  return null;
}

export function normalizePacket(raw = {}, now = Date.now()) {
  const id = String(raw.worker_id ?? raw.id ?? "UNKNOWN");
  const reportedState = normalizeStatus(raw.state ?? raw.status);
  const lastHeartbeat = raw.heartbeat_at ?? raw.lastHeartbeat ?? null;
  const fresh = heartbeatIsFresh(lastHeartbeat, now);

  const consumed = Number.isSafeInteger(raw.budget_consumed_micros) ? raw.budget_consumed_micros : null;
  const limit = Number.isSafeInteger(raw.budget_limit_micros) ? raw.budget_limit_micros : null;
  const remaining = consumed !== null && limit !== null ? Math.max(0, limit - consumed) : null;
  const cost = {
    consumedMicros: consumed,
    limitMicros: limit,
    remainingMicros: remaining,
    truthState: consumed !== null ? "SUPERVISOR_RECORDED" : "UNKNOWN"
  };

  // Local duplication of capability.effectiveStatus staleness collapse:
  // reported RUNNING with stale/missing heartbeat cannot be trusted → UNKNOWN.
  let status = reportedState;
  let statusEvidence = "worker9-packet";
  if (reportedState === "RUNNING" && !fresh) {
    status = "UNKNOWN";
    statusEvidence = "worker9-packet-stale-heartbeat";
  }

  const reviewState = String(raw.review_state || "").trim().toUpperCase();
  const REVIEW_STATES = ["NOT_SENT", "PENDING", "APPROVED", "REJECTED"];

  return {
    id,
    name: String(raw.module ?? raw.scope ?? ("Worker " + id)),
    status,
    reportedState,
    statusEvidence,
    currentTask: raw.scope ?? raw.current_task ?? null,
    model: raw.preferred_model ?? raw.model ?? null,
    provider: null,
    lastHeartbeat,
    heartbeatFresh: fresh,
    cost,
    branch: raw.branch ?? null,
    lastCheckpoint: raw.checkpoint_sha ?? raw.last_checkpoint ?? null,
    latestCommit: null,
    blocker: normalizeBlocker(raw.blocker ?? raw.decision_required ?? null),
    reviewState: REVIEW_STATES.includes(reviewState) ? reviewState : "UNKNOWN",
    retryCount: Number.isSafeInteger(raw.retry_count) ? raw.retry_count : null,
    maxRetries: Number.isSafeInteger(raw.max_retries) ? raw.max_retries : null,
    controls: {}
  };
}

export function unknownWorker(id, name, branch = null) {
  return {
    id: String(id),
    name: String(name ?? ("Worker " + id)),
    status: "UNKNOWN",
    reportedState: null,
    statusEvidence: "none",
    currentTask: null,
    model: null,
    provider: null,
    lastHeartbeat: null,
    heartbeatFresh: false,
    cost: { consumedMicros: null, limitMicros: null, remainingMicros: null, truthState: "UNKNOWN" },
    branch: branch ?? null,
    lastCheckpoint: null,
    latestCommit: null,
    blocker: null,
    reviewState: "UNKNOWN",
    retryCount: null,
    maxRetries: null,
    controls: {}
  };
}

export function isSameOriginWrite(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  const type = request.headers.get("Content-Type") || "";
  return origin === url.origin &&
    (!site || site === "same-origin") &&
    type.toLowerCase().startsWith("application/json");
}

export function safeMoney(micros) {
  return Number.isSafeInteger(micros) ? "$" + (micros / 1_000_000).toFixed(2) : "UNKNOWN";
}
