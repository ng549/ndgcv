# Factory Test #6 — Architecture Review (independent)

Reviewer: Architecture Reviewer (authored none of the reviewed code; independent of
implementers and of the Worker D ownership auditor).
Worktree: `/home/factory-user/repos/ndgcv-factory-test-06`
Branch: `integration/factory-test-06-command-center` @ `4337a6d`
Range reviewed: `git diff 9a9aaca..HEAD` (5 commits)
References: `/tmp/t6-canonical.json` (canonical 0.7), Control Tower contract
`origin/nexus-v2-p1-01-control-tower:nexus-v2-control-tower/CONTROL-TOWER-CONTRACT.md` (0.2.0-draft),
`nexus-v2-control-tower/module-registry.json` (0.2.0), prior `OWNERSHIP-AUDIT.md` (confirmed, not adopted).

## VERDICT: ACCEPTED

The integration respects the Nexus V2 module-first architecture and the Control Tower
contract in substance, and is a structurally sound merge candidate. No CRITICAL or HIGH
findings. The prior ownership audit (F1–F6) is **confirmed as accurate for its range**; its
two MEDIUM findings (F1 README overstatement, F2 stale handoff) were remediated by the
subsequent commit `4337a6d` — README now states the honest mechanism
(`README.md:23` "Control availability is **derived** … Worker 9 remains the enforcement
authority; its 409 is final") and `WORKER-13-HANDOFF.json` now reads
`canonical.version: 0.7`, `status: "Implemented / Unverified"` with refreshed
`implemented`/`verified`/`not_verified` lists. F3–F5 stand as accepted LOW notes.

---

## Findings

### A1 (MEDIUM) — Actor identity is audited locally but NOT propagated to Worker 9
Control Tower §2: "State-changing commands require an idempotency key and actor identity."
Worker 13 records `actor_email` in `operator_audit` on every REQUESTED/ACCEPTED/REJECTED/
DENIED (`src/index.mjs:133-145` `audit()`), and sends `x-idempotency-key`
(`src/adapter.mjs:48`) — but the command body forwarded to Worker 9 is only
`{ command, payload }` (`src/adapter.mjs:115-120`). The operator's identity (email, or
`actortype=operator`/`actorid` per CT §4.2) never crosses the module boundary, so Worker 9's
own `supervisor_events` will record state changes without an initiating actor. Locally
auditable, end-to-end unattributable.
Evidence: `src/adapter.mjs:104-121` (body lacks actor), `src/index.mjs:158-167`.
Recommendation: add `requested_by: <operator email>` (or an `actor` object) to the command
payload, ideally folded into the Worker 9 auth handoff so it lands with owner acceptance.
Does not block merge (Phase One reconciliation item), but must appear on the Control Tower
integration-gate checklist under "tenant and identity propagation."

### A2 (LOW) — Money carries integer minor units but no explicit ISO 4217 currency
CT §2 requires "integer minor units plus ISO 4217 currency." The wire and view use
`budget_limit_micros` / `consumedMicros` as bare integers (`schemas/orchestrator-command.contract.json:40`,
`schemas/operator-view.contract.json` cost def); "micro-USD" exists only in prose
descriptions. A `currency: "USD"` field should accompany the amounts at the next contract
revision. Non-blocking; USD-only is a fair Phase One default, but it is a real deviation from
the letter of the invariant.

### A3 (LOW) — Scope (`tenant`/`system`) is implicit, not declared
CT §2: "Every request declares `scope` as `tenant` or `system`." This module is operator-plane,
single-operator, and has no tenant concept, so implicit system/operator scope is
**adequate for Phase One** — judged acceptable. However nothing in the contracts records
that decision; the Control Tower reconciliation should log "operator plane = system scope,
no tenant_id" as an explicit ACR/ADR entry rather than letting each consumer infer it.

### A4 (LOW) — Contract version skew is handled honestly, but the `$id` invites collision
`schemas/orchestrator-command.contract.json` declares `"version": 2` and
`$id: ".../worker9-command-request.v2.json"` while its content mirrors Worker 9's published
**v1** `command-contract.json`. This is defensible layering — it is version 2 of Worker 13's
*consumption* contract, and the `x-alignment` block
(`schemas/orchestrator-command.contract.json:74`) plus `operator-view.contract.json`
`contractVersion: "worker9-command-contract-v1"` state the provenance explicitly and
truthfully. The residual risk is naming: an `$id` prefixed `worker9-...v2` could be mistaken
at Control Tower merge time for a Worker 9-owned major bump (which only Worker 9 may issue,
CT §4.1). Recommend renaming the `$id` to an `operator-command-center`-namespaced URI at
reconciliation. Content itself is compatible and honestly labeled.

### A5 (LOW) — Live-world readiness gaps in the operator-view contract
Checked against the future NEXUS live-world needs (canonical `nicolas_command_center.shows`
and `worker_control`). Present and correctly shaped: worker state (with staleness collapse),
model, cost (consumed/limit/remaining + truthState), heartbeat (+freshness), blocker, review
state, branch, lastCheckpoint, command capability with reasons. **Gaps (forward-looking,
non-blocking):**
- `provider` is hard-wired `null` and `latestCommit` is hard-wired `null`
  (`src/core.mjs:73,80`) — the schema carries the fields but Worker 9 supplies no evidence
  yet; correctly labeled UNKNOWN rather than fabricated (Golden Rule PASS), but the live
  topology/cost ledger will need Worker 9 to emit these.
- No `work_packet_id` distinct from worker id, no `active_execution_id`/lease surfaced into
  the view (they were added to `orchestrator-worker-state.contract.json` in this diff but are
  not consumed by `normalizePacket`), no acceptance-criteria state, no dependency edges
  behind `WAITING_ON_DEPENDENCY`.
- Cost is budget-field only (`SUPERVISOR_RECORDED`); no usage-event or ledger linkage
  (Managed Ops owns pricing per CT §3) — correct boundary today, integration debt tomorrow.
Severity LOW because absence is disclosed, never faked.

### A6 (LOW) — CI is adequate but thin at the edges
`.github/workflows/worker13-command-center-check.yml` triggers on the integration branch +
`workflow_dispatch`, path-scoped correctly, and runs `npm run check` (syntax-checks all 5
`src/*.mjs`) plus `npm test` (all `tests/*.test.mjs` — verified locally: 77 pass, 0 fail,
2 todo). Node 22 in CI vs Node 24 local: **no compatibility risk found** — tests use only
`node:test` and long-stable APIs (`fetch`, `crypto.subtle`, `atob`, `AbortController`, all
present in Node 18+/Workers). Gaps: no JSON-Schema validation of the three contract files,
no `wrangler deploy --dry-run` config validation, no fixture-server integration job in CI
(the integration test is in-process, so this is minor). None blocking.

### A7 (INFO) — Prior audit findings F1–F6 disposition
F1 (README) and F2 (handoff staleness): **fixed** at `4337a6d`, verified by re-read.
F3 (REASSIGN_MODEL preference hint not in UI): partially fixed — commit message claims a
preference hint; `README.md:138` documents preference semantics; UI caption remains minimal.
Stands as LOW. F4 (fixture tokenLast4), F5 (CSP unsafe-inline), F6 (worker9-index deletion
legitimacy): **confirmed** as correctly assessed.

---

## Verification of the assigned checklist

1. **Module boundaries — PASS.** `src/adapter.mjs` is a pure HTTP client against Worker 9's
   real routes (`GET /api/workers`, `POST /api/workers/:id/commands`, `/api/run-all-ready`,
   `/api/run-phase/:phase`); the only cross-module strings in `src/` are provenance
   *comments*. No imports from `worker-supervisor` (grep-verified), no private-table reads,
   no shared-code creep (the duplicated `HEARTBEAT_STALE_MS` is deliberate and documented,
   `src/core.mjs:15-17`). `git diff 9a9aaca..HEAD -- nexus-v2/worker-supervisor` is **empty**;
   the auth proposal lives in Worker 13's own `handoff/` with a "PROPOSED — NOT INTEGRATED —
   REQUIRES WORKER 9 OWNER ACCEPTANCE" banner (`handoff/WORKER-9-AUTH-PROPOSAL.md:3-4`) and
   a tested reference implementation. Proposal-not-modify is exactly the ACR etiquette CT §5
   requires.
2. **Control Tower invariants — PASS with A1/A2/A3.** Idempotency key on every mutation;
   integer micros; RFC 3339 UTC (`observedAt`, `heartbeat_at` `format: date-time`);
   append-style `operator_audit` (migration `0001_audit.sql` columns match the `audit()`
   insert exactly — no migration drift); **no merge endpoint anywhere** (`ACTIONS` in
   `src/core.mjs:5-8` contains no merge; canonical merge policy honored); auth is real
   (Cloudflare Access RS256 JWT + single-operator allowlist + rate limiter fail-closed).
3. **Contract hygiene — PASS (see A4).** Spot-check executed: ran `core.normalizePacket` +
   `capability.deriveControls` on a live sample and validated the output mentally against
   `schemas/operator-view.contract.json` — all 17 required workerView fields present, no
   extras (`additionalProperties: false` respected), all 9 controls present with
   `allowed`/`reason`, closed `cost` object, top-level consts
   (`contractVersion`, `capabilitySource`) match emitted values exactly.
4. **Single-entry consolidation — PASS.** `wrangler.jsonc` `main: "src/index.mjs"`;
   `package.json` `check` covers all five `src/*.mjs`; repo-wide grep for `worker9-index`
   returns only historical/report/README references (baseline narrative, audit, ownership
   table) — zero dangling code or config references.
5. **Live-world readiness — see A5.** Substantively ready; gaps are disclosed UNKNOWNs, not
   fabrications.
6. **CI — see A6.** Full test suite covered; Node 22 vs 24 is a non-issue here.
7. **Merge-risk sweep — PASS.** Deleted `src/worker9-index.mjs` referenced nowhere live;
   seed list `SEED_WORKERS` (`src/index.mjs:8-16`) = {1,2,7,8,9,12,13} matches Worker 1's
   `module-registry.json` branch names exactly and equals canonical `active_workers`
   {1,2,7,8,12} ∪ priority_override `start_now` {9,13} — no divergence (business/client
   modules 3,4,5,6,10,11 correctly absent; they hold no work packets). Protected artifacts
   (`NEXUS-V2-CANONICAL.json`, `worker-supervisor`, `ai-gateway`, `nexus-v2-control-tower`)
   untouched in range. No history rewrite; five commits sit cleanly atop `9a9aaca`.

## Commands run (read-only)

```
git log --oneline 9a9aaca..HEAD ; git diff --stat 9a9aaca..HEAD
git diff 9a9aaca..HEAD -- nexus-v2/worker-supervisor nexus-v2/ai-gateway nexus-v2-control-tower nexus-v2/NEXUS-V2-CANONICAL.json   # empty
git -C ../ndgcv show origin/nexus-v2-p1-01-control-tower:nexus-v2-control-tower/CONTROL-TOWER-CONTRACT.md
git -C ../ndgcv show origin/nexus-v2-p1-01-control-tower:nexus-v2-control-tower/module-registry.json
grep -rn "worker9-index" . ; grep -n "worker-supervisor" src/*.mjs
cd nexus-v2/operator-command-center && node --test tests/*.test.mjs   # 77 pass / 0 fail / 2 todo
node -e '<normalizePacket + deriveControls sample>'                   # validated against schema
```

Full reads: `src/index.mjs`, `src/adapter.mjs`, `src/core.mjs`, `src/capability.mjs`,
`schemas/operator-view.contract.json`, `schemas/orchestrator-command.contract.json`,
`schemas/orchestrator-worker-state.contract.json` (diff), `migrations/0001_audit.sql`,
`wrangler.jsonc`, `package.json`, `.github/workflows/worker13-command-center-check.yml`,
`handoff/WORKER-9-AUTH-PROPOSAL.md`, `reports/factory-test-06/OWNERSHIP-AUDIT.md`,
`README.md` (grep-verified remediation), `WORKER-13-HANDOFF.json` (grep-verified), canonical 0.7.
