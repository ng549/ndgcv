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

test("RUN PHASE server-renders enabled when allowed (client gates on phase input)", () => {
  const html = renderPage(model()); // default model: RUN_PHASE allowed
  assert.match(html, /<button id="runPhase">RUN PHASE<\/button>/);
  assert.match(html, /<input id="phase" placeholder="Phase">/);
});

test("RUN PHASE server-renders disabled with reason when not allowed", () => {
  const m = model({ globalControls: { RUN_ALL_READY: { allowed: false, reason: "no_ready_workers" }, RUN_PHASE: { allowed: false, reason: "orchestrator_not_connected" } } });
  const html = renderPage(m);
  assert.match(html, /<button id="runPhase" disabled title="orchestrator_not_connected">/);
});

test("long reason strings cannot overflow narrow viewports", () => {
  // Browser-validated defect (390px viewport): unbroken reason text overflowed
  // .reason -> .controls -> card -> page. Lock the wrap rules in place.
  const html = renderPage(model());
  assert.match(html, /\.reason\{[^}]*overflow-wrap:anywhere/);
  assert.match(html, /\.controls button\{[^}]*overflow-wrap:anywhere/);
});

test("REASSIGN_MODEL is labeled preference-only (Worker 8 boundary)", () => {
  const m = model({ workers: [worker({ controls: controls({ REASSIGN_MODEL: { allowed: true, reason: null } }) })] });
  const html = renderPage(m);
  assert.match(html, /data-action="REASSIGN_MODEL" title="Sets the preferred model[^"]*AI Gateway still qualify/);
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

test("disabled global controls show a visible reason caption, not tooltip-only", () => {
  const m = model({ globalControls: { RUN_ALL_READY: { allowed: false, reason: "no_ready_workers" }, RUN_PHASE: { allowed: false, reason: "orchestrator_not_connected" } } });
  const html = renderPage(m);
  assert.match(html, /<button id="runAll" disabled[^>]*>RUN ALL READY<\/button><div class="reason">no_ready_workers<\/div>/);
  assert.match(html, /<button id="runPhase" disabled[^>]*>RUN PHASE<\/button><div class="reason">orchestrator_not_connected<\/div>/);
});

test("enabled REASSIGN_MODEL shows an always-visible preference-only caption", () => {
  const m = model({ workers: [worker({ controls: controls({ REASSIGN_MODEL: { allowed: true, reason: null } }) })] });
  const html = renderPage(m);
  assert.match(html, /preference only &mdash; Worker 9 \+ AI Gateway qualify the route/);
});

test("client script guards double-submit, reload preserves in-flight input, model input capped", () => {
  const html = renderPage(model());
  const script = html.split("<script>")[1].split("</" + "script>")[0];
  assert.ok(script.includes("b.disabled=true"), "disable-on-click present");
  assert.ok(script.includes("b.disabled=false"), "re-enable on failure present");
  assert.ok(script.includes(":not(:placeholder-shown)"), "reload skips when inputs have content");
  assert.match(html, /data-input="model"[^>]*maxlength="128"|maxlength="128"[^>]*data-input="model"/);
});
