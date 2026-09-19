export const STATUS = Object.freeze([
  "RUNNING","READY","WAITING_ON_DEPENDENCY","BLOCKED","NEEDS_REVIEW",
  "FAILED","STOPPED","PAUSED","COMPLETE","UNKNOWN"
]);

export const ACTIONS = Object.freeze(["RUN","CONTINUE","PAUSE","RESUME","STOP","RETRY"]);

export function normalizeStatus(value) {
  const candidate = String(value || "").trim().toUpperCase().replace(/[ -]+/g, "_");
  return STATUS.includes(candidate) ? candidate : "UNKNOWN";
}

export function normalizeWorker(raw = {}) {
  const controls = {};
  for (const action of ACTIONS) controls[action] = raw?.controls?.[action] === true;
  return {
    id: String(raw.id ?? raw.worker_id ?? "UNKNOWN"),
    name: String(raw.name ?? raw.worker_name ?? "Unknown worker"),
    status: normalizeStatus(raw.status),
    currentTask: raw.current_task ?? raw.currentTask ?? null,
    model: raw.model ?? null,
    lastHeartbeat: raw.last_heartbeat ?? raw.lastHeartbeat ?? null,
    costMicros: Number.isSafeInteger(raw.cost_micros) ? raw.cost_micros : null,
    branch: raw.branch ?? null,
    lastCheckpoint: raw.last_checkpoint ?? raw.lastCheckpoint ?? null,
    latestCommit: raw.latest_commit ?? raw.latestCommit ?? null,
    budgetConsumedMicros: Number.isSafeInteger(raw.budget_consumed_micros) ? raw.budget_consumed_micros : null,
    blocker: raw.blocker ?? raw.decision_required ?? null,
    controls
  };
}

export function unknownWorker(id, name, branch = null) {
  return normalizeWorker({ id, name, branch, status: "UNKNOWN", controls: {} });
}

export function commandSupported(worker, action) {
  return ACTIONS.includes(action) && worker?.controls?.[action] === true;
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
