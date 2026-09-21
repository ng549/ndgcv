// tests/capability.test.mjs — Worker A. Self-contained: imports ONLY
// src/capability.mjs (core.mjs is Worker B's; WorkerView-shaped objects are
// constructed inline). Verifies capability derivation mirrors Worker 9's
// commandTransition guards (command-contract v1) and the Golden Rule that
// absent evidence (UNKNOWN status, stale/missing heartbeat) disables all
// controls with explicit non-null reason strings.

import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTRACT_VERSION,
  HEARTBEAT_STALE_MS,
  heartbeatFresh,
  effectiveStatus,
  deriveControls,
  deriveGlobalControls
} from "../src/capability.mjs";

const ALL_ACTIONS = [
  "RUN", "CONTINUE", "PAUSE", "RESUME", "STOP", "RETRY",
  "REASSIGN_MODEL", "ADJUST_BUDGET", "SEND_TO_REVIEW"
];

const NOW = Date.parse("2026-09-21T18:40:00.000Z");
const FRESH = new Date(NOW - 60 * 1000).toISOString();
const STALE = new Date(NOW - HEARTBEAT_STALE_MS - 1000).toISOString();

function makeView({ status, reportedState = status, lastHeartbeat = null, reviewState = "NOT_SENT",
  cost = { consumedMicros: null, limitMicros: null, remainingMicros: null, truthState: "UNKNOWN" },
  retryCount = null, maxRetries = null } = {}) {
  return {
    id: "w-test",
    name: "Test worker",
    status,
    reportedState,
    statusEvidence: "worker9-packet",
    currentTask: null,
    model: null,
    provider: null,
    lastHeartbeat,
    heartbeatFresh: heartbeatFresh(lastHeartbeat, NOW),
    cost,
    branch: null,
    lastCheckpoint: null,
    latestCommit: null,
    blocker: null,
    reviewState,
    retryCount,
    maxRetries,
    controls: {}
  };
}

function assertShape(controls) {
  assert.deepEqual(Object.keys(controls).sort(), [...ALL_ACTIONS].sort());
  for (const action of ALL_ACTIONS) {
    const c = controls[action];
    assert.equal(typeof c.allowed, "boolean", `${action}.allowed must be boolean`);
    if (c.allowed) assert.equal(c.reason, null, `${action}.reason must be null when allowed`);
    else {
      assert.equal(typeof c.reason, "string", `${action}.reason must be a string when disabled`);
      assert.ok(c.reason.length > 0, `${action}.reason must be non-empty`);
    }
  }
}

function assertAllowed(controls, allowed) {
  for (const action of ALL_ACTIONS) {
    assert.equal(
      controls[action].allowed,
      allowed.includes(action),
      `${action} should be ${allowed.includes(action) ? "allowed" : "disabled"}`
    );
  }
}

test("contract version and stale window match Worker 9 (10-minute lease)", () => {
  assert.equal(CONTRACT_VERSION, "worker9-command-contract-v1");
  assert.equal(HEARTBEAT_STALE_MS, 10 * 60 * 1000);
});

test("heartbeatFresh: missing, malformed, stale, fresh", () => {
  assert.equal(heartbeatFresh(null, NOW), false);
  assert.equal(heartbeatFresh(undefined, NOW), false);
  assert.equal(heartbeatFresh("not-a-date", NOW), false);
  assert.equal(heartbeatFresh(STALE, NOW), false);
  assert.equal(heartbeatFresh(FRESH, NOW), true);
});

test("effectiveStatus: RUNNING + stale heartbeat collapses to UNKNOWN", () => {
  const r = effectiveStatus("RUNNING", STALE, NOW);
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.reportedState, "RUNNING");
  assert.equal(r.stale, true);
});

test("effectiveStatus: RUNNING + missing heartbeat collapses to UNKNOWN", () => {
  const r = effectiveStatus("RUNNING", null, NOW);
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.stale, true);
});

test("effectiveStatus: RUNNING + fresh heartbeat stays RUNNING", () => {
  const r = effectiveStatus("RUNNING", FRESH, NOW);
  assert.equal(r.status, "RUNNING");
  assert.equal(r.stale, false);
});

test("effectiveStatus: unknown reported state collapses to UNKNOWN", () => {
  const r = effectiveStatus("GARBAGE", null, NOW);
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.stale, false);
});

test("READY: RUN/CONTINUE/PAUSE/STOP + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "READY" }), NOW);
  assertShape(c);
  assertAllowed(c, ["RUN", "CONTINUE", "PAUSE", "STOP", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("RUNNING + fresh heartbeat: PAUSE/STOP + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "RUNNING", lastHeartbeat: FRESH }), NOW);
  assertShape(c);
  assertAllowed(c, ["PAUSE", "STOP", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("RUNNING + stale heartbeat: collapses to UNKNOWN, all 9 disabled with stale_heartbeat", () => {
  const c = deriveControls(makeView({ status: "UNKNOWN", reportedState: "RUNNING", lastHeartbeat: STALE }), NOW);
  assertShape(c);
  assertAllowed(c, []);
  for (const a of ALL_ACTIONS) assert.equal(c[a].reason, "stale_heartbeat");
});

test("RUNNING + missing heartbeat: collapses to UNKNOWN, all 9 disabled with missing_heartbeat", () => {
  const c = deriveControls(makeView({ status: "UNKNOWN", reportedState: "RUNNING", lastHeartbeat: null }), NOW);
  assertShape(c);
  assertAllowed(c, []);
  for (const a of ALL_ACTIONS) assert.equal(c[a].reason, "missing_heartbeat");
});

test("PAUSED: RESUME/STOP + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "PAUSED" }), NOW);
  assertShape(c);
  assertAllowed(c, ["RESUME", "STOP", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("STOPPED: RUN/CONTINUE/RETRY + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "STOPPED" }), NOW);
  assertShape(c);
  assertAllowed(c, ["RUN", "CONTINUE", "RETRY", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("FAILED: RUN/CONTINUE/PAUSE/STOP/RETRY + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "FAILED" }), NOW);
  assertShape(c);
  assertAllowed(c, ["RUN", "CONTINUE", "PAUSE", "STOP", "RETRY", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("BLOCKED: RETRY + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "BLOCKED" }), NOW);
  assertShape(c);
  assertAllowed(c, ["RETRY", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("NEEDS_REVIEW + NOT_SENT: SEND_TO_REVIEW + packet mutations allowed", () => {
  const c = deriveControls(makeView({ status: "NEEDS_REVIEW", reviewState: "NOT_SENT" }), NOW);
  assertShape(c);
  assertAllowed(c, ["SEND_TO_REVIEW", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("NEEDS_REVIEW + REJECTED: SEND_TO_REVIEW allowed (resend)", () => {
  const c = deriveControls(makeView({ status: "NEEDS_REVIEW", reviewState: "REJECTED" }), NOW);
  assertShape(c);
  assertAllowed(c, ["SEND_TO_REVIEW", "REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("NEEDS_REVIEW + PENDING: SEND_TO_REVIEW disabled with review-state reason", () => {
  const c = deriveControls(makeView({ status: "NEEDS_REVIEW", reviewState: "PENDING" }), NOW);
  assertShape(c);
  assertAllowed(c, ["REASSIGN_MODEL", "ADJUST_BUDGET"]);
  assert.equal(c.SEND_TO_REVIEW.reason, "review_state_pending_rejects_send_to_review");
});

test("COMPLETE: only packet mutations allowed (terminal)", () => {
  const c = deriveControls(makeView({ status: "COMPLETE" }), NOW);
  assertShape(c);
  assertAllowed(c, ["REASSIGN_MODEL", "ADJUST_BUDGET"]);
});

test("UNKNOWN: all 9 disabled with status_unknown", () => {
  const c = deriveControls(makeView({ status: "UNKNOWN", reportedState: null }), NOW);
  assertShape(c);
  assertAllowed(c, []);
  for (const a of ALL_ACTIONS) assert.equal(c[a].reason, "status_unknown");
});

test("deriveGlobalControls: not connected disables both with orchestrator_not_connected", () => {
  const g = deriveGlobalControls(false, [makeView({ status: "READY" })]);
  assert.deepEqual(g.RUN_ALL_READY, { allowed: false, reason: "orchestrator_not_connected" });
  assert.deepEqual(g.RUN_PHASE, { allowed: false, reason: "orchestrator_not_connected" });
});

test("deriveGlobalControls: connected with a READY worker enables both", () => {
  const g = deriveGlobalControls(true, [makeView({ status: "READY" })]);
  assert.deepEqual(g.RUN_ALL_READY, { allowed: true, reason: null });
  assert.deepEqual(g.RUN_PHASE, { allowed: true, reason: null });
});

test("deriveGlobalControls: connected with no READY worker disables RUN_ALL_READY", () => {
  const g = deriveGlobalControls(true, [makeView({ status: "COMPLETE" })]);
  assert.deepEqual(g.RUN_ALL_READY, { allowed: false, reason: "no_ready_workers" });
  assert.deepEqual(g.RUN_PHASE, { allowed: true, reason: null });
});

test("deriveGlobalControls: connected with zero workers disables RUN_ALL_READY", () => {
  const g = deriveGlobalControls(true, []);
  assert.equal(g.RUN_ALL_READY.allowed, false);
  assert.equal(g.RUN_ALL_READY.reason, "no_ready_workers");
});

test("READY with zero remaining budget disables RUN/CONTINUE (predicts Worker 9 BUDGET_EXHAUSTED)", () => {
  const controls = deriveControls(makeView({
    status: "READY",
    cost: { consumedMicros: 2000000, limitMicros: 2000000, remainingMicros: 0, truthState: "SUPERVISOR_RECORDED" }
  }), NOW);
  assert.deepEqual(controls.RUN, { allowed: false, reason: "budget_exhausted_predicted" });
  assert.deepEqual(controls.CONTINUE, { allowed: false, reason: "budget_exhausted_predicted" });
  assert.equal(controls.PAUSE.allowed, true, "PAUSE is not budget-gated");
  assert.equal(controls.ADJUST_BUDGET.allowed, true, "ADJUST_BUDGET stays available to fix the budget");
  assertShape(controls);
});

test("READY with unknown budget keeps RUN/CONTINUE state-eligible (no fabricated block)", () => {
  const controls = deriveControls(makeView({ status: "READY" }), NOW);
  assert.equal(controls.RUN.allowed, true);
  assert.equal(controls.CONTINUE.allowed, true);
});

test("FAILED at retry ceiling disables RUN/CONTINUE (predicts Worker 9 RETRY_LIMIT); RETRY stays available", () => {
  const controls = deriveControls(makeView({ status: "FAILED", retryCount: 3, maxRetries: 3 }), NOW);
  assert.deepEqual(controls.RUN, { allowed: false, reason: "retry_limit_reached" });
  assert.deepEqual(controls.CONTINUE, { allowed: false, reason: "retry_limit_reached" });
  assert.equal(controls.RETRY.allowed, true, "RETRY transition itself is not limited; the next launch is");
  assertShape(controls);
});

test("FAILED below retry ceiling keeps RUN/CONTINUE", () => {
  const controls = deriveControls(makeView({ status: "FAILED", retryCount: 1, maxRetries: 3 }), NOW);
  assert.equal(controls.RUN.allowed, true);
  assert.equal(controls.CONTINUE.allowed, true);
});
