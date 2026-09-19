import test from "node:test";
import assert from "node:assert/strict";
import {
  dependencyState, fileScopesConflict, readyPackets, chooseModel, validateLaunch,
  nextStateAfterExecution, commandTransition, reviewDecision, makeIdempotencyKey, SupervisorError
} from "../src/core.mjs";

const base = (overrides={}) => ({
  worker_id:"9", phase:"1", module:"orchestration", scope:"build supervisor",
  branch:"nexus-v2-p1-09-build-orchestration", allowed_files:["nexus-v2/worker-supervisor/**"],
  context_refs:["nexus-v2/NEXUS-V2-CANONICAL.json"], acceptance_criteria:["tests pass"],
  dependencies:[], preferred_model:"primary", fallback_models:["fallback"],
  budget_limit_micros:1_000_000, budget_consumed_micros:0, canonical_sha:"abc",
  state:"READY", retry_count:0, max_retries:3, packet_version:1, checkpoint_sha:null,
  review_state:"NOT_SENT", ...overrides
});

test("dependencies gate readiness", () => {
  const p=base({dependencies:["8"]});
  assert.equal(dependencyState(p,[p,base({worker_id:"8",state:"NEEDS_REVIEW"})]).ready,false);
  assert.equal(dependencyState(p,[p,base({worker_id:"8",state:"COMPLETE"})]).ready,true);
});

test("run-all excludes exhausted budget and write conflicts", () => {
  const running=base({worker_id:"1",state:"RUNNING",allowed_files:["shared/**"],branch:"b1"});
  const conflict=base({worker_id:"2",allowed_files:["shared/file.js"],branch:"b2"});
  const broke=base({worker_id:"3",budget_consumed_micros:1_000_000,branch:"b3"});
  const safe=base({worker_id:"4",allowed_files:["other/**"],branch:"b4"});
  assert.deepEqual(readyPackets([running,conflict,broke,safe]).map(x=>x.worker_id),["4"]);
  assert.equal(fileScopesConflict(running,conflict),true);
});

test("model selection uses qualified fallback", () => {
  assert.equal(chooseModel(base(),{primary:{available:false},fallback:{available:true}}),"fallback");
});

test("launch rejects stale canonical", () => {
  assert.throws(() => validateLaunch(base(),{allPackets:[base()],currentCanonicalSha:"new"}), e => e instanceof SupervisorError && e.code==="STALE_CANONICAL");
});

test("launch rejects budget exhaustion", () => {
  const p=base({budget_consumed_micros:1_000_000});
  assert.throws(() => validateLaunch(p,{allPackets:[p],currentCanonicalSha:"abc"}), e => e.code==="BUDGET_EXHAUSTED");
});

test("acceptance claim never completes without external review", () => {
  const transition=nextStateAfterExecution(base(),{acceptance:{all_satisfied:true},verification:{passed:true}});
  assert.equal(transition.state,"NEEDS_REVIEW");
});

test("unfinished execution auto-continues via READY", () => {
  assert.equal(nextStateAfterExecution(base(),{acceptance:{all_satisfied:false},verification:{passed:true}}).state,"READY");
});

test("repeated failures become blocker", () => {
  const transition=nextStateAfterExecution(base({retry_count:2}),{failed:true});
  assert.equal(transition.state,"BLOCKED");
  assert.equal(transition.reason,"repeated_failure");
});

test("commands enforce pause/resume and budget floor", () => {
  const paused=commandTransition(base(),"PAUSE");
  assert.equal(paused.state,"PAUSED");
  assert.equal(commandTransition(paused,"RESUME").state,"READY");
  assert.throws(() => commandTransition(base({budget_consumed_micros:500}),"ADJUST_BUDGET",{budget_limit_micros:499}), e => e.code==="INVALID_COMMAND");
});

test("complete requires independent review approval", () => {
  const candidate=base({state:"NEEDS_REVIEW",review_state:"PENDING"});
  assert.equal(reviewDecision(candidate,{approved:true,reviewer:"worker-reviewer",evidence:["tests"]}).state,"COMPLETE");
  assert.equal(reviewDecision(candidate,{approved:false,reviewer:"worker-reviewer"}).state,"READY");
});

test("idempotency key is stable across same checkpoint", () => {
  const p=base({checkpoint_sha:"deadbeef",packet_version:2});
  assert.equal(makeIdempotencyKey(p),makeIdempotencyKey({...p}));
});
