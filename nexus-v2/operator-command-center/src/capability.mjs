// src/capability.mjs — capability derivation for the operator command center.
//
// PROVENANCE: every control decision in this file is DERIVED from Worker 9's
// published command contract v1 (nexus-v2/worker-supervisor/contracts/command-contract.json)
// and the `commandTransition` state machine in worker-supervisor/src/core.mjs.
// Worker 9 remains the sole enforcement authority: a 409 from
// POST /api/workers/:id/commands is FINAL. This module only predicts what
// Worker 9 will accept so the UI can disable controls and explain why.
// Golden Rule: absent evidence => UNKNOWN status => all controls disabled.
// Pure functions, no I/O, no imports from other module files.

export const CONTRACT_VERSION = "worker9-command-contract-v1";

// Matches Worker 9's execution lease duration (10 minutes); a RUNNING packet
// whose heartbeat is older than this (or missing) can no longer be believed.
export const HEARTBEAT_STALE_MS = 10 * 60 * 1000;

export const ACTIONS = Object.freeze([
  "RUN", "CONTINUE", "PAUSE", "RESUME", "STOP", "RETRY",
  "REASSIGN_MODEL", "ADJUST_BUDGET", "SEND_TO_REVIEW"
]);

export const GLOBAL_ACTIONS = Object.freeze(["RUN_ALL_READY", "RUN_PHASE"]);

// Allowed source states mirrored from Worker 9 `commandTransition` (contract v1).
// RUN/CONTINUE additionally require launch guards (deps/budget/conflicts) that
// only Worker 9 can fully evaluate; "allowed" here means "state-eligible".
const STATE_GUARDS = Object.freeze({
  RUN: ["READY", "FAILED", "STOPPED"],
  CONTINUE: ["READY", "FAILED", "STOPPED"],
  PAUSE: ["READY", "RUNNING", "FAILED"],
  RESUME: ["PAUSED"],
  STOP: ["READY", "RUNNING", "PAUSED", "FAILED"],
  RETRY: ["FAILED", "BLOCKED", "STOPPED"],
  // Packet-level mutations accepted by Worker 9 in any persisted state.
  REASSIGN_MODEL: "*",
  ADJUST_BUDGET: "*",
  // Worker 9 commandTransition: SEND_TO_REVIEW requires state NEEDS_REVIEW.
  // Review-state gating (NOT_SENT / REJECTED) is applied on top below.
  SEND_TO_REVIEW: ["NEEDS_REVIEW"]
});

export function heartbeatFresh(lastHeartbeat, now = Date.now()) {
  if (typeof lastHeartbeat !== "string" || lastHeartbeat.length === 0) return false;
  const ts = Date.parse(lastHeartbeat);
  if (Number.isNaN(ts)) return false;
  return now - ts < HEARTBEAT_STALE_MS;
}

// RUNNING with a stale or missing heartbeat collapses to UNKNOWN: we have no
// fresh evidence the worker is alive, so no capability may be claimed.
export function effectiveStatus(reportedState, lastHeartbeat, now = Date.now()) {
  const reported = typeof reportedState === "string" && reportedState.length > 0
    ? reportedState
    : "UNKNOWN";
  if (reported === "RUNNING") {
    if (!lastHeartbeat) return { status: "UNKNOWN", reportedState: "RUNNING", stale: true };
    if (!heartbeatFresh(lastHeartbeat, now)) {
      return { status: "UNKNOWN", reportedState: "RUNNING", stale: true };
    }
  }
  if (!["READY", "RUNNING", "PAUSED", "STOPPED", "WAITING_ON_DEPENDENCY", "BLOCKED",
    "FAILED", "NEEDS_REVIEW", "COMPLETE"].includes(reported)) {
    return { status: "UNKNOWN", reportedState: reported, stale: false };
  }
  return { status: reported, reportedState: reported, stale: false };
}

function disallowAll(reason) {
  const controls = {};
  for (const action of ACTIONS) controls[action] = { allowed: false, reason };
  return controls;
}

// workerView: normalized WorkerView shape (see schemas/operator-view.contract.json).
// Returns { ACTION: { allowed: boolean, reason: string|null } } for ALL 9 actions.
export function deriveControls(workerView, now = Date.now()) {
  const view = workerView && typeof workerView === "object" ? workerView : {};
  const reported = typeof view.reportedState === "string" && view.reportedState
    ? view.reportedState
    : view.status;
  const { status, reportedState, stale } = effectiveStatus(reported, view.lastHeartbeat ?? null, now);

  if (status === "UNKNOWN") {
    let reason = "status_unknown";
    if (reportedState === "RUNNING" && stale) {
      reason = (view.lastHeartbeat ?? null) ? "stale_heartbeat" : "missing_heartbeat";
    }
    return disallowAll(reason);
  }

  const reviewState = typeof view.reviewState === "string" ? view.reviewState : "UNKNOWN";
  const controls = {};
  for (const action of ACTIONS) {
    const guard = STATE_GUARDS[action];
    let allowed = guard === "*" || guard.includes(status);
    let reason = null;

    if (action === "SEND_TO_REVIEW" && allowed) {
      // Derived refinement of Worker 9 contract v1: re-sending an already
      // PENDING or APPROVED review is meaningless; REJECTED or NOT_SENT may send.
      if (reviewState === "NOT_SENT" || reviewState === "REJECTED") {
        allowed = true;
      } else {
        allowed = false;
        reason = `review_state_${reviewState.toLowerCase()}_rejects_send_to_review`;
      }
    }

    if (!allowed && reason === null) {
      reason = `state_${status.toLowerCase()}_rejects_${action.toLowerCase()}`;
    }
    controls[action] = { allowed, reason };
  }
  return controls;
}

// Global (bulk) controls. connected=false means the orchestrator could not be
// reached/validated, so nothing may be claimed. RUN_ALL_READY also requires at
// least one worker currently in READY (Worker 9 only launches READY packets
// that pass dependency/budget/conflict guards; finer eligibility is its call).
export function deriveGlobalControls(connected, workers = []) {
  if (!connected) {
    return {
      RUN_ALL_READY: { allowed: false, reason: "orchestrator_not_connected" },
      RUN_PHASE: { allowed: false, reason: "orchestrator_not_connected" }
    };
  }
  const list = Array.isArray(workers) ? workers : [];
  const hasReady = list.some(w => w && w.status === "READY");
  return {
    RUN_ALL_READY: {
      allowed: hasReady,
      reason: hasReady ? null : "no_ready_workers"
    },
    RUN_PHASE: {
      // Phase eligibility depends on the operator-supplied phase value, which
      // the UI gates separately; at derivation time we only require connectivity.
      allowed: true,
      reason: null
    }
  };
}
