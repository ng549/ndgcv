import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS, GLOBAL_ACTIONS, HEARTBEAT_STALE_MS,
  isSameOriginWrite, normalizePacket, normalizeStatus, unknownWorker
} from "../src/core.mjs";

test("unknown or unsupported status never becomes RUNNING", () => {
  assert.equal(normalizeStatus("probably running"), "UNKNOWN");
  assert.equal(normalizeStatus(undefined), "UNKNOWN");
  assert.equal(normalizeStatus("running"), "RUNNING");
});

test("ACTIONS/GLOBAL_ACTIONS are the frozen command sets", () => {
  assert.deepEqual([...ACTIONS], ["RUN", "CONTINUE", "PAUSE", "RESUME", "STOP", "RETRY", "REASSIGN_MODEL", "ADJUST_BUDGET", "SEND_TO_REVIEW"]);
  assert.deepEqual([...GLOBAL_ACTIONS], ["RUN_ALL_READY", "RUN_PHASE"]);
});

test("normalizePacket defaults controls to empty (capability module populates later)", () => {
  const w = normalizePacket({ worker_id: 9, state: "ready" });
  assert.deepEqual(w.controls, {});
  assert.equal(w.status, "READY");
  assert.equal(w.reportedState, "READY");
});

test("unknown worker is truth-safe", () => {
  const worker = unknownWorker("8", "AI Gateway", "branch");
  assert.equal(worker.status, "UNKNOWN");
  assert.equal(worker.statusEvidence, "none");
  assert.equal(worker.reviewState, "UNKNOWN");
  assert.equal(worker.cost.truthState, "UNKNOWN");
  assert.equal(worker.branch, "branch");
  assert.equal(worker.model, null);
  assert.equal(worker.provider, null);
  assert.equal(worker.lastHeartbeat, null);
});

test("writes require same origin JSON", () => {
  const ok = new Request("https://nicolasgoureau.com/operator/api/global", {
    method: "POST",
    headers: { Origin: "https://nicolasgoureau.com", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: "{}"
  });
  const cross = new Request("https://nicolasgoureau.com/operator/api/global", {
    method: "POST",
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(isSameOriginWrite(ok), true);
  assert.equal(isSameOriginWrite(cross), false);
});

test("normalizePacket maps budget fields to cost with SUPERVISOR_RECORDED", () => {
  const now = Date.now();
  const w = normalizePacket({
    worker_id: 13,
    state: "READY",
    heartbeat_at: new Date(now).toISOString(),
    budget_consumed_micros: 400000,
    budget_limit_micros: 1000000
  }, now);
  assert.equal(w.cost.consumedMicros, 400000);
  assert.equal(w.cost.limitMicros, 1000000);
  assert.equal(w.cost.remainingMicros, 600000);
  assert.equal(w.cost.truthState, "SUPERVISOR_RECORDED");
});

test("missing budget yields nulls and UNKNOWN truth state", () => {
  const w = normalizePacket({ worker_id: 13, state: "READY" });
  assert.equal(w.cost.consumedMicros, null);
  assert.equal(w.cost.limitMicros, null);
  assert.equal(w.cost.remainingMicros, null);
  assert.equal(w.cost.truthState, "UNKNOWN");
});

test("RUNNING with stale heartbeat collapses to UNKNOWN", () => {
  const now = Date.now();
  const stale = new Date(now - HEARTBEAT_STALE_MS - 1000).toISOString();
  const w = normalizePacket({ worker_id: 9, state: "RUNNING", heartbeat_at: stale }, now);
  assert.equal(w.status, "UNKNOWN");
  assert.equal(w.reportedState, "RUNNING");
  assert.equal(w.heartbeatFresh, false);
  assert.match(w.statusEvidence, /stale-heartbeat/);
});

test("NEEDS_REVIEW is preserved with reviewState", () => {
  const w = normalizePacket({ worker_id: 1, state: "NEEDS_REVIEW", review_state: "PENDING" });
  assert.equal(w.status, "NEEDS_REVIEW");
  assert.equal(w.reportedState, "NEEDS_REVIEW");
  assert.equal(w.reviewState, "PENDING");
});

test("blocker object and string normalization", () => {
  const fromObject = normalizePacket({ worker_id: 7, blocker: { message: "Waiting on credentials", code: "AUTH" } });
  assert.equal(fromObject.blocker, "Waiting on credentials");
  const fromCode = normalizePacket({ worker_id: 7, blocker: { code: "DEP_MISSING" } });
  assert.equal(fromCode.blocker, "DEP_MISSING");
  const fromString = normalizePacket({ worker_id: 7, blocker: "plain text blocker" });
  assert.equal(fromString.blocker, "plain text blocker");
  const none = normalizePacket({ worker_id: 7 });
  assert.equal(none.blocker, null);
});

test("retry_count and max_retries map to WorkerView; absent -> null", () => {
  const w = normalizePacket({ worker_id: 9, state: "FAILED", retry_count: 2, max_retries: 3 });
  assert.equal(w.retryCount, 2);
  assert.equal(w.maxRetries, 3);
  const none = normalizePacket({ worker_id: 9, state: "READY" });
  assert.equal(none.retryCount, null);
  assert.equal(none.maxRetries, null);
});
