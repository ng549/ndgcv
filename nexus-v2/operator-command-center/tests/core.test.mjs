import test from "node:test";
import assert from "node:assert/strict";
import { commandSupported, isSameOriginWrite, normalizeStatus, normalizeWorker, unknownWorker } from "../src/core.mjs";

test("unknown or unsupported status never becomes RUNNING", () => {
  assert.equal(normalizeStatus("probably running"), "UNKNOWN");
  assert.equal(normalizeStatus(undefined), "UNKNOWN");
  assert.equal(normalizeStatus("running"), "RUNNING");
});

test("missing controls are disabled", () => {
  const worker = normalizeWorker({ id: 9, status: "ready" });
  assert.equal(commandSupported(worker, "RUN"), false);
  assert.equal(commandSupported(worker, "STOP"), false);
});

test("only explicitly true controls enable actions", () => {
  const worker = normalizeWorker({ id: 9, status: "ready", controls: { RUN: true, STOP: false } });
  assert.equal(commandSupported(worker, "RUN"), true);
  assert.equal(commandSupported(worker, "STOP"), false);
});

test("unknown worker is truth-safe", () => {
  const worker = unknownWorker("8", "AI Gateway", "branch");
  assert.equal(worker.status, "UNKNOWN");
  assert.equal(worker.branch, "branch");
  assert.equal(worker.model, null);
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
