// tests/adapter.test.mjs — Worker C (Factory Test #6)
// FIXTURE-BASED; NOT PRODUCTION VERIFICATION. All Worker 9 traffic is served by the
// in-process fake (fixtures/worker9-server.mjs); nothing here proves behavior of the
// real worker-supervisor deployment.
//
// Tests for src/adapter.mjs against the FROZEN contract (reports/factory-test-06/CONTRACTS.md).
// src/adapter.mjs is owned by Worker A and is written in parallel; if it is absent when this
// suite runs, every test skips with a diagnostic instead of failing the suite.
//
// Test-plan area mapping (of the 24 required areas) — areas covered HERE:
//   - worker-9-unavailable      → "HTTP 500 → HTTP_ERROR", "hang → TIMEOUT"
//   - auth-invalid (boundary)   → "401/403 → AUTH_REJECTED" (incl. authEnforced fake)
//   - malformed-response        → "malformed JSON → INVALID_PAYLOAD", "wrong shape → INVALID_PAYLOAD"
//   - command-failure           → "command 409/500 → HTTP_ERROR/AUTH_REJECTED"
//   - idempotency-key forwarding→ "sendWorkerCommand sends x-idempotency-key"
//   - wire translation          → "budgetLimitMicros → budget_limit_micros"
//   - global actions            → runAllReady path, runPhase URL-encoding
//   - not-configured            → NOT_CONFIGURED when env missing
// Areas covered ELSEWHERE: capability derivation/state machine (tests/capability.test.mjs,
// Worker A), WorkerView normalization (tests/core.test.mjs, Worker B), UI rendering
// (tests/ui.test.mjs, Worker B), auth-negative at the Worker 13 entry
// (tests/integration.test.mjs, this worker).

import test from "node:test";
import assert from "node:assert/strict";
import { startFakeWorker9 } from "../fixtures/worker9-server.mjs";
import { readyPacket, runningFreshPacket } from "../fixtures/packets.mjs";

// src/adapter.mjs may not exist yet (Worker A works in parallel). Skip gracefully.
let adapter = null;
try {
  adapter = await import("../src/adapter.mjs");
} catch {
  adapter = null;
}
const PENDING = adapter === null;
const pendingMsg = "src/adapter.mjs not present yet (Worker A) — test written, pending integration run";
const t = (name, opts, fn) => {
  if (typeof opts === "function") { fn = opts; opts = {}; }
  return test(name, { skip: PENDING ? pendingMsg : false, ...opts }, fn);
};

const envFor = (url, token = "TEST_DUMMY_TOKEN") => ({
  ORCHESTRATOR_BASE_URL: url,
  ORCHESTRATOR_TOKEN: token
});

const errorCode = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("expected adapter call to throw");
};

t("NOT_CONFIGURED when ORCHESTRATOR_BASE_URL missing", async () => {
  const error = await errorCode(adapter.listPackets({}));
  assert.equal(error.code, "NOT_CONFIGURED");
});

t("happy-path listPackets returns packets + observedAt", async () => {
  const server = await startFakeWorker9({
    list: { mode: "ok", packets: [readyPacket(), runningFreshPacket({ worker_id: "W2" })] }
  });
  try {
    const result = await adapter.listPackets(envFor(server.url));
    assert.equal(result.packets.length, 2);
    assert.equal(result.packets[0].worker_id, "W1");
    assert.equal(typeof result.observedAt, "string");
    assert.ok(!Number.isNaN(Date.parse(result.observedAt)), "observedAt is ISO date-time");
    // Bearer token was presented (Worker 9 ignores it today — see auth proposal).
    assert.equal(server.requests[0].tokenPresent, true);
    assert.equal(server.requests[0].tokenLast4, "OKEN"); // last 4 of TEST_DUMMY_TOKEN
  } finally {
    await server.close();
  }
});

t("malformed JSON → INVALID_PAYLOAD", async () => {
  const server = await startFakeWorker9({ list: { mode: "malformed" } });
  try {
    const error = await errorCode(adapter.listPackets(envFor(server.url)));
    assert.equal(error.code, "INVALID_PAYLOAD");
  } finally {
    await server.close();
  }
});

t("valid JSON, workers not an array → INVALID_PAYLOAD", async () => {
  const server = await startFakeWorker9({ list: { mode: "wrongShape" } });
  try {
    const error = await errorCode(adapter.listPackets(envFor(server.url)));
    assert.equal(error.code, "INVALID_PAYLOAD");
  } finally {
    await server.close();
  }
});

t("valid JSON, packet missing worker_id → INVALID_PAYLOAD", async () => {
  const bad = readyPacket();
  delete bad.worker_id;
  const server = await startFakeWorker9({ list: { mode: "ok", packets: [bad] } });
  try {
    const error = await errorCode(adapter.listPackets(envFor(server.url)));
    assert.equal(error.code, "INVALID_PAYLOAD");
  } finally {
    await server.close();
  }
});

t("HTTP 500 → HTTP_ERROR with httpStatus 500", async () => {
  const server = await startFakeWorker9({ list: { mode: "http", status: 500 } });
  try {
    const error = await errorCode(adapter.listPackets(envFor(server.url)));
    assert.equal(error.code, "HTTP_ERROR");
    assert.equal(error.httpStatus, 500);
  } finally {
    await server.close();
  }
});

t("401 → AUTH_REJECTED; 403 → AUTH_REJECTED", async () => {
  for (const status of [401, 403]) {
    const server = await startFakeWorker9({ list: { mode: "http", status } });
    try {
      const error = await errorCode(adapter.listPackets(envFor(server.url)));
      assert.equal(error.code, "AUTH_REJECTED", `status ${status}`);
    } finally {
      await server.close();
    }
  }
});

t("PROPOSED Worker 9 auth enforced: wrong token → AUTH_REJECTED surfaces", async () => {
  const server = await startFakeWorker9({
    authEnforced: true,
    token: "correct-token-9999",
    list: { mode: "ok", packets: [] }
  });
  try {
    const error = await errorCode(
      adapter.listPackets(envFor(server.url, "wrong-token-0000")));
    assert.equal(error.code, "AUTH_REJECTED");
    assert.equal(error.httpStatus, 403);
  } finally {
    await server.close();
  }
});

t("server that never responds → TIMEOUT", { timeout: 12000 }, async () => {
  const server = await startFakeWorker9({ list: { mode: "hang" } });
  try {
    // Contract timeout is 5s; node fetch runs against a real socket here.
    const error = await errorCode(adapter.listPackets(envFor(server.url)));
    assert.equal(error.code, "TIMEOUT");
  } finally {
    await server.close();
  }
});

t("sendWorkerCommand: camelCase → snake_case wire body + x-idempotency-key", async () => {
  const server = await startFakeWorker9({ command: { mode: "ok", commandId: "cmd-9" } });
  try {
    const result = await adapter.sendWorkerCommand(
      envFor(server.url), "W1", "ADJUST_BUDGET", { budgetLimitMicros: 7_500_000 }, "req-idem-1", "operator@example.com");
    const recorded = server.requests.at(-1);
    assert.equal(recorded.method, "POST");
    assert.equal(recorded.path, "/api/workers/W1/commands");
    assert.equal(recorded.xIdempotencyKey, "req-idem-1");
    assert.equal(recorded.body.command, "ADJUST_BUDGET");
    assert.deepEqual(recorded.body.payload, { budget_limit_micros: 7_500_000 });
    assert.equal(recorded.body.requested_by, "operator@example.com");
    assert.equal(recorded.body.request_id, "req-idem-1");
    assert.equal(result.command_id ?? result.commandId, "cmd-9");
  } finally {
    await server.close();
  }
});

t("sendWorkerCommand: empty-payload command sends {} and idempotency key", async () => {
  const server = await startFakeWorker9({ command: { mode: "ok" } });
  try {
    await adapter.sendWorkerCommand(envFor(server.url), "W1", "PAUSE", {}, "req-idem-2");
    const recorded = server.requests.at(-1);
    // request_id rides along (forward-compatible); requested_by omitted when not supplied.
    assert.deepEqual(recorded.body, { command: "PAUSE", payload: {}, request_id: "req-idem-2" });
    assert.equal(recorded.xIdempotencyKey, "req-idem-2");
  } finally {
    await server.close();
  }
});

t("sendWorkerCommand: 409 → HTTP_ERROR with httpStatus 409", async () => {
  const server = await startFakeWorker9({ command: { mode: "http", status: 409 } });
  try {
    const error = await errorCode(
      adapter.sendWorkerCommand(envFor(server.url), "W1", "STOP", {}, "req-idem-3"));
    assert.equal(error.code, "HTTP_ERROR");
    assert.equal(error.httpStatus, 409);
  } finally {
    await server.close();
  }
});

t("runAllReady posts to /api/run-all-ready", async () => {
  const server = await startFakeWorker9({ runAllReady: { mode: "ok", accepted: ["W1", "W2"] } });
  try {
    const result = await adapter.runAllReady(envFor(server.url), "req-idem-4");
    const recorded = server.requests.at(-1);
    assert.equal(recorded.method, "POST");
    assert.equal(recorded.path, "/api/run-all-ready");
    assert.equal(recorded.xIdempotencyKey, "req-idem-4");
    assert.ok(Array.isArray(result.accepted ?? result?.accepted?.worker_ids ?? result));
  } finally {
    await server.close();
  }
});

t("runPhase URL-encodes the phase and posts to /api/run-phase/:phase", async () => {
  const server = await startFakeWorker9({ runPhase: { mode: "ok", accepted: ["W3"] } });
  try {
    const phase = "phase 1/build";
    await adapter.runPhase(envFor(server.url), phase, "req-idem-5");
    const recorded = server.requests.at(-1);
    assert.equal(recorded.method, "POST");
    assert.ok(recorded.path.startsWith("/api/run-phase/"), recorded.path);
    assert.ok(!recorded.path.includes(" "), "phase must be URL-encoded");
    assert.equal(decodeURIComponent(recorded.path.slice("/api/run-phase/".length)), phase);
    assert.equal(recorded.xIdempotencyKey, "req-idem-5");
  } finally {
    await server.close();
  }
});
