# Task / Workspace / Worker Audit

Status: INSPECTED.

## Task system
V1 `nexus-tasks.js` contains IDs, workstream, summary, horizon, status, owner, documents, dependencies, approval requirement, category, phase, priority, next action, execution path, instructions, acceptance criteria and deliverables. Saved mutable state is merged separately.

Useful concepts:
- stable task ID;
- dependencies;
- explicit owner/execution path;
- acceptance evidence;
- accepted revision;
- acceptance history;
- distinct implementation/test/deploy/accept notions;
- blocking/review states;
- task-specific human guide.

Problems:
- task definition mixes roadmap, UI, execution and acceptance concerns;
- static source + saved state can diverge;
- statuses do not match V2 canonical ladder;
- project-specific path assumptions;
- legacy NX task IDs are not V2 Work Packet IDs.

Recommendation: **ADAPT** concepts into Worker 9 Work Packet contract; do not migrate storage/schema.

## Search
`feature/nexus-task-search` tip `b4884cca3f1b4e1b60a44abdb51c9acd4bc92bb4` adds production-dashboard search verification. `fix/nexus-search-bundled-runtime` exists but is behind late foundation. Search must survive as a requirement, but implementation provenance is fragmented.
Recommendation: **REBUILD** search over canonical Work Packet/project read models.

## Workspace
Product requirement: clicking a task opens the place work is actually performed. V1 surfaces route tasks into old Nexus workspace/executor flows, but no clean isolated workspace subsystem was found.
Recommendation: **REBUILD** around Work Packet detail/execution/evidence.

## Codex executor
Evidence:
- workflow registration commit `79eba46a5f62c8fa518ffd092fac63f426b60526`;
- `.github/workflows/nexus-executor.yml`;
- `scripts/nexus/runner.mjs`;
- later branches for API key env, CLI pinning, registration, progress reporting and smoke test.

Strong reusable controls:
- persisted job claim;
- explicit allowed scope;
- no credentials persisted in Codex checkout;
- build/check before publication;
- draft PR only;
- no automatic deploy/accept;
- callback result describes failure honestly.

Contamination:
- hardcoded Merchant-PRO app path;
- hardcoded foundation base branch;
- hardcoded old Worker callback URL;
- GitHub Actions + Codex CLI coupling;
- provider key assumptions;
- fragile branch-specific registration.

Recommendation: controls **REFERENCE ONLY**; execution implementation **REBUILD** in Worker 9.

## Grok control
Branch `grok/nexus-operator-control`, tip `ee5849be06c8bb29b27eb48d5d33080fb23eb600`, adds send/pause/resume/stop around Grok Build and draft-PR-only behavior. This is valuable as execution UX/policy evidence, not as a second bespoke worker stack.
Recommendation: **REFERENCE ONLY** product behavior; Worker 9 implements provider-neutral adapters.

## Worker 2 comparison
Temporal is a strong maintained option for durable workflows/retries/long-running approvals; Trigger.dev is a lighter alternative. V1 custom executor should therefore not be preserved merely for speed. Worker 9 should evaluate whether a managed durable orchestrator shortens the under-8-week path.
