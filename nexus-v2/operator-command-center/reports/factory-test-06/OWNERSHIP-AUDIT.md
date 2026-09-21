# Factory Test #6 — Ownership & Architecture Audit (Worker D)

Auditor: Worker D (independent; authored none of the audited code)
Worktree: `/home/factory-user/repos/ndgcv-factory-test-06`
Branch: `integration/factory-test-06-command-center` @ `5ef47d5`
Range audited: `git diff 9a9aaca..HEAD` (3 commits: `318c4e6`, `88298c8`, `5ef47d5`)

## VERDICT: ACCEPTED

No ownership violations and no CRITICAL architecture non-conformance found. All new content
stays inside `nexus-v2/operator-command-center/**` plus the declared workflow file; protected
artifacts (`NEXUS-V2-CANONICAL.json`, `worker-supervisor`, `ai-gateway`, `nexus-v2-control-tower`)
are untouched both in the audited range and relative to `origin/nexus-v2`. Findings below are
documentation-accuracy and hardening notes, not blockers.

---

## Findings

### F1 (MEDIUM) — README.md overstates one gating claim and understates new capability
File: `nexus-v2/operator-command-center/README.md`
- Line ~25: "Every action is disabled unless the orchestrator explicitly advertises it." —
  inaccurate for the new code. Worker 9's API does not advertise capabilities; controls are
  derived locally by `src/capability.mjs:1-11` from the published contract v1 ("PROVENANCE"
  header) plus live packet state. The claim overstates the runtime guarantee (orchestrator
  advertisement) while the real mechanism (contract-derived prediction, Worker 9's 409 final)
  is at least as strong — the sentence should be corrected, not just softened.
- "What is implemented" lists RUN/CONTINUE/PAUSE/RESUME/STOP/RETRY and global controls but
  omits `SEND_TO_REVIEW`, capability derivation, the heartbeat-staleness collapse, cost
  truthState, and the Worker 9 auth proposal — the README now understates the module.
- README is orchestrator-owned per `OWNERSHIP.md`; workers were correct not to touch it.
  Action: orchestrator updates README before merge to `nexus-v2`.

### F2 (MEDIUM) — WORKER-13-HANDOFF.json is stale relative to the new code
File: `nexus-v2/operator-command-center/WORKER-13-HANDOFF.json`
- `canonical.version` says `0.5`; `/tmp/t6-canonical.json` is version `0.7`.
- `implemented` omits SEND_TO_REVIEW, capability derivation module, operator-view contract,
  integration fixtures/harness, and the auth proposal handoff.
- `verified` still claims "core guard tests executed locally: 5 passed 0 failed" — the suite
  has grown substantially (adapter/capability/core/ui/integration/auth-proposal tests);
  the count no longer reflects reality.
- Golden Rule impact: the handoff is not *false* about what it claims, but it is incomplete
  and presents outdated verification evidence. Orchestrator-owned; update required.

### F3 (LOW) — REASSIGN_MODEL preference-only semantics not visible in the UI itself
The Worker 8 boundary is respected in substance: the wire payload is `{model}` stored as
`preferred_model` (`schemas/orchestrator-command.contract.json:24-31`,
`src/core.mjs:73`), and `reports/factory-test-06/BASELINE.md:57` explicitly documents
"REASSIGN_MODEL sets a *preference* … Worker 9/8 apply qualification and policy." However
the rendered control (`src/ui.mjs` `commandButton`, label "REASSIGN_MODEL", placeholder
"model id") gives the operator no hint that this is a preference, not a provider/model
selection. Canonical wording ("Model assignments are preferences, not blockers") is honored
in docs/schemas; a one-line caption in the UI would close the gap. No provider selection
anywhere in the module — verified by inspection.

### F4 (LOW) — Test fixtures record tokenLast4; acceptable
`fixtures/worker9-server.mjs:57` records `tokenLast4` (last 4 chars) of the bearer token in
fixture request logs. Tokens used are dummy test values
(`tests/adapter.test.mjs:45`, `tests/integration.test.mjs`, `tests/worker9-auth-proposal.test.mjs:22`),
never real secrets, and last-4 disclosure is an industry-accepted debugging pattern. Acceptable.
The production token itself never leaves the server side: it is read from `env` only in
`src/adapter.mjs:31-46`, never rendered by `src/ui.mjs` (client script contains no credential),
never logged (`audit()` logs actor/action/outcome only), and error messages carry codes, not
credential material. PASS on credential hygiene.

### F5 (LOW) — CSP allows inline scripts/styles
`src/index.mjs` Content-Security-Policy includes `script-src 'unsafe-inline'`. This is a
deliberate single-file-render choice on an Access-gated, single-operator surface with
escapeHtml used consistently; risk is bounded. Noted for Phase Two hardening (nonce/hash).

### F6 (INFO) — `src/worker9-index.mjs` deletion is legitimate ownership
The deleted file was Worker 13's earlier entrypoint inside its own module (listed as
"DELETE `src/worker9-index.mjs`" under Worker B in `OWNERSHIP.md`). It is not Worker 9's
module. No violation.

---

## Item-by-item verification

1. **Ownership boundaries** — PASS. 26 changed paths; all under
   `nexus-v2/operator-command-center/**` except `.github/workflows/worker13-command-center-check.yml`
   (declared orchestrator-owned). `git status --porcelain --untracked-files=all` is empty
   (no untracked files outside scope; this report is the single authorized new file).
2. **Protected artifacts** — PASS. `git diff 9a9aaca..HEAD -- nexus-v2/NEXUS-V2-CANONICAL.json
   nexus-v2/worker-supervisor nexus-v2/ai-gateway nexus-v2-control-tower` is empty, and
   `git diff origin/nexus-v2..HEAD --stat -- <same paths>` is empty (no pre-existing
   worker-branch modifications to hide behind, either).
3. **Workflow scope** — PASS. The `.github/` diff is exactly: one added branch trigger line
   (`integration/factory-test-06-command-center`) and one added `workflow_dispatch:` key.
4. **In-module ownership mapping** — PASS (by path; orchestrator committed all):
   - Orchestrator: `reports/factory-test-06/*` (BASELINE, CONTRACTS, COST-BASELINE, OWNERSHIP), workflow file.
   - Worker A: `src/capability.mjs`, `src/adapter.mjs`, all three `schemas/*`, `tests/capability.test.mjs`.
   - Worker B: `src/core.mjs`, `src/ui.mjs`, `src/index.mjs`, DELETE `src/worker9-index.mjs`,
     `wrangler.jsonc`, `package.json`, `tests/core.test.mjs`, `tests/ui.test.mjs`.
   - Worker C: `fixtures/*`, `tests/adapter.test.mjs`, `tests/integration.test.mjs`,
     `tests/worker9-auth-proposal.test.mjs`, `handoff/*`.
   Every changed file maps to a declared owner; no file is unowned or cross-owned.
5. **Architecture conformance** — PASS with notes:
   - (a) UI is not authoritative: capability is derived from Worker 9's published contract,
     derivation is labeled (`src/capability.mjs:3-9`, `schemas/operator-view.contract.json`
     description, UI footer "Capability source: derived-from-worker9-command-contract-v1"),
     Worker 9 remains enforcement authority (409 final; stale heartbeat collapses RUNNING to
     UNKNOWN; disconnected orchestrator disables everything).
   - (b) Idempotency: every state-changing POST carries `x-idempotency-key`
     (`src/adapter.mjs` `orchestratorFetch`; requestId generated/propagated in `src/index.mjs`
     `commandWorker`/`commandGlobal`) and is recorded in the audit row.
   - (c) Money is integer micro-USD end-to-end (`budget_limit_micros` integer schema,
     `Number.isSafeInteger` checks in `src/core.mjs` and `buildPayload`, dollars converted to
     micros client-side before POST).
   - (d) Credentials: see F4 — PASS.
   - (e) Worker 8 boundary: preference-only, no provider selection — see F3 — PASS in substance.
   - (f) Auth handoff: `handoff/WORKER-9-AUTH-PROPOSAL.md:1-5` is banner-labeled
     "PROPOSED — NOT INTEGRATED — REQUIRES WORKER 9 OWNER ACCEPTANCE"; it and the reference
     implementation live in Worker 13's own `handoff/` directory; `worker-supervisor` is
     unmodified (item 2). PASS.
6. **Golden Rule in claims** — See F1/F2. New code itself is conservative (UNKNOWN fail-safe,
   truthState labeling, disabled controls without evidence). The stale orchestrator-owned
   docs are the only gap.
7. **Branch isolation** — PASS. `git log --oneline -8` shows only the three test-06 commits
   atop Worker 13's branch head `9a9aaca`; no main/nexus-v2 history rewritten.
   `git diff origin/nexus-v2-p1-13-operator-command-center..HEAD --stat` shows exactly the
   module-only change set listed in item 1 (2435 insertions, 372 deletions, 26 files).

## Commands run (all read-only except the single report write)

```
git log --oneline -8
git diff --name-status 9a9aaca..HEAD
git status --porcelain --untracked-files=all              # empty output
git log --format='%H %s' 9a9aaca..HEAD                     # 3 commits, listed above
git diff 9a9aaca..HEAD -- nexus-v2/NEXUS-V2-CANONICAL.json nexus-v2/worker-supervisor nexus-v2/ai-gateway nexus-v2-control-tower   # empty
git diff origin/nexus-v2..HEAD --stat -- nexus-v2/worker-supervisor nexus-v2/ai-gateway nexus-v2-control-tower                   # empty
git diff 9a9aaca..HEAD -- .github/                         # only trigger line + workflow_dispatch
git diff origin/nexus-v2-p1-13-operator-command-center..HEAD --stat   # 26 files, module-only
grep -rn "TOKEN|tokenLast4|Bearer|secret|password" nexus-v2/operator-command-center   # reviewed all 40+ hits; none leak a real credential
```

Plus full reads of: `src/adapter.mjs`, `src/capability.mjs`, `src/core.mjs`, `src/ui.mjs`,
`src/index.mjs`, `README.md`, `WORKER-13-HANDOFF.json`, `OWNERSHIP.md`,
`schemas/orchestrator-command.contract.json`, `schemas/operator-view.contract.json`,
`handoff/WORKER-9-AUTH-PROPOSAL.md` (header + auth sections), `/tmp/t6-canonical.json`.
