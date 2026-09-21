import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../src/ui.mjs";

function controls(overrides = {}) {
  const base = {};
  for (const a of ["RUN", "CONTINUE", "PAUSE", "RESUME", "STOP", "RETRY", "REASSIGN_MODEL", "ADJUST_BUDGET", "SEND_TO_REVIEW"]) {
    base[a] = { allowed: false, reason: "not_available" };
  }
  return { ...base, ...overrides };
}

function worker(overrides = {}) {
  return {
    id: "9",
    name: "Build Orchestration",
    status: "READY",
    reportedState: "READY",
    statusEvidence: "worker9-packet",
    currentTask: "phase-9",
    model: "gpt-x",
    provider: null,
    lastHeartbeat: "2026-09-21T18:00:00.000Z",
    heartbeatFresh: true,
    cost: { consumedMicros: 1234567, limitMicros: 5000000, remainingMicros: 3765433, truthState: "SUPERVISOR_RECORDED" },
    branch: "nexus-v2-p1-09-build-orchestration",
    lastCheckpoint: "abc123",
    latestCommit: null,
    blocker: null,
    reviewState: "NOT_SENT",
    controls: controls(),
    ...overrides
  };
}

function model(overrides = {}) {
  return {
    connected: true,
    reason: null,
    observedAt: "2026-09-21T18:05:00.000Z",
    contractVersion: "worker9-command-contract-v1",
    capabilitySource: "derived-from-worker9-command-contract-v1",
    workers: [worker()],
    globalControls: {
      RUN_ALL_READY: { allowed: false, reason: "no_ready_workers" },
      RUN_PHASE: { allowed: true, reason: null }
    },
    ...overrides
  };
}

test("disallowed actions render disabled buttons with reason text", () => {
  const html = renderPage(model());
  assert.match(html, /<button[^>]*data-action="RUN"[^>]*disabled[^>]*title="not_available"/);
  assert.match(html, /<div class="reason">not_available<\/div>/);
});

test("allowed action renders an enabled button", () => {
  const m = model({ workers: [worker({ controls: controls({ STOP: { allowed: true, reason: null } }) })] });
  const html = renderPage(m);
  assert.match(html, /<button data-worker="9" data-action="STOP"><\/button>|<button data-worker="9" data-action="STOP">STOP<\/button>/);
});

test("UNKNOWN worker shows UNKNOWN status and no enabled controls", () => {
  const w = worker({ status: "UNKNOWN", reportedState: null, statusEvidence: "none", controls: controls() });
  const html = renderPage(model({ workers: [w] }));
  assert.match(html, /data-status="UNKNOWN">UNKNOWN/);
  assert.match(html, /no runtime evidence/);
  const buttons = html.match(/<button data-worker="9" data-action="[A-Z_]+"(?![^>]*disabled)[^>]*>/g) || [];
  assert.equal(buttons.length, 0);
});

test("cost renders $X.XX from micros and UNKNOWN when null", () => {
  const html = renderPage(model());
  assert.match(html, /\$1\.23/);
  assert.match(html, /\$5\.00/);
  assert.match(html, /\$3\.77/);
  const unknown = renderPage(model({
    workers: [worker({ cost: { consumedMicros: null, limitMicros: null, remainingMicros: null, truthState: "UNKNOWN" } })]
  }));
  assert.match(unknown, /Cost consumed<\/div><div class="value ">UNKNOWN/);
  assert.match(unknown, /\(UNKNOWN\)/);
});

test("provider shows UNKNOWN when null", () => {
  const html = renderPage(model());
  assert.match(html, /Provider<\/div><div class="value ">UNKNOWN/);
});

test("NEEDS_REVIEW shows unverified-claim qualifier and review state fact", () => {
  const w = worker({ status: "NEEDS_REVIEW", reportedState: "NEEDS_REVIEW", reviewState: "PENDING" });
  const html = renderPage(model({ workers: [w] }));
  assert.match(html, /completion claim unverified/);
  assert.match(html, /Review state<\/div><div class="value ">PENDING/);
});

test("emitted client script contains zero backticks", () => {
  const html = renderPage(model());
  const script = html.split("<script>")[1].split("</script>")[0];
  assert.equal(script.includes(String.fromCharCode(96)), false);
});

test("worker name injection is escaped", () => {
  const w = worker({ name: '<script>alert("x")</script>' });
  const html = renderPage(model({ workers: [w] }));
  assert.ok(!html.includes('<script>alert("x")</script>'));
  assert.match(html, /&lt;script&gt;alert/);
});

test("RUN PHASE button markup present and disabled until phase input non-empty", () => {
  const html = renderPage(model());
  assert.match(html, /<button id="runPhase" disabled/);
  assert.match(html, /<input id="phase" placeholder="Phase">/);
});

test("mobile viewport meta present", () => {
  const html = renderPage(model());
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
});

test("disconnected badge shows reason", () => {
  const html = renderPage(model({ connected: false, reason: "AUTH_REJECTED" }));
  assert.match(html, /DISCONNECTED/);
  assert.match(html, /AUTH_REJECTED/);
});
