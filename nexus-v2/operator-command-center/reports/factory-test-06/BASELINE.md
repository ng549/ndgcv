# Factory Test #6 — Current-State Baseline

Captured: 2026-09-21 ~18:40 UTC, before any implementation change.
Method: fresh `git fetch` of all branches; every claim below was re-verified against current branch HEADs, not the Test #1 snapshot.

## Branch HEADs inspected

| Branch | HEAD | Last commit | CI at HEAD |
|---|---|---|---|
| `nexus-v2` (integration) | `87f4c01` | 2026-09-20 | n/a (no CI workflow scoped to it for these modules) |
| `nexus-v2-p1-01-control-tower` | `4610cd5` | 2026-09-19 | not re-run |
| `nexus-v2-p1-08-ai-gateway` | `0ecdad7` | 2026-09-19 | not re-run |
| `nexus-v2-p1-09-build-orchestration` | `72389be` | 2026-09-19 | **success** (run 35433537544 per Worker 9 handoff; latest run on branch green) |
| `nexus-v2-p1-13-operator-command-center` | `9a9aaca` | 2026-09-19 | **failure** (GitHub Actions run 35433769779) |

## Canonical re-read

- Current: `nexus-v2/NEXUS-V2-CANONICAL.json` version **0.7**, updated 2026-09-20, at commit `87f4c01` ("Record Agency Build Stack Factory evaluation and hard requirements").
- Canonical history (newest first): `87f4c01`, `56b472e`, `cff1545`, `3865aa3`, `23b87a4` — the canonical HAS changed since Test #1 (the Agency Build Stack evaluation record and hard requirements were added).
- **Drift finding:** Worker 9 and Worker 13 handoffs both pin canonical `0.5` @ `ca446bf…`. Worker 9's runtime `STALE_CANONICAL` launch guard would reject launches against current canonical `87f4c01` until packets are re-pinned. Recorded as a known integration fact; re-pinning Work Packets is Worker 9/Control Tower authority, not Factory's.

## Worker 13 current state (HEAD `9a9aaca`)

Module: `nexus-v2/operator-command-center/`

1. **CI is red at HEAD.** `npm run check` executes `node --check src/worker9-index.mjs && node --check src/core.mjs`. Verified locally:
   - `src/worker9-index.mjs:52` — literal `\n` characters inside source (the Test #1 defect): `SyntaxError: Invalid or unexpected token`. **Still exists.**
   - `src/index.mjs:233` — nested unescaped backticks (client-side template literal inside the server-side page template): `SyntaxError: Unexpected token 'class'`. **Second, previously unrecorded parse failure.**
   - `src/core.mjs` parses; the 5 unit tests pass (they only import `core.mjs`), but CI runs `check` first, so the workflow fails.
2. **Two parallel, incompatible implementations exist.** `wrangler.jsonc` deploys `src/worker9-index.mjs` (aligned to Worker 9's real `/api/*` routes). `src/index.mjs` is an unreferenced parallel implementation that speaks `/v1/workers`, `/v1/workers/:id/actions`, `/v1/actions` — **routes Worker 9 does not expose**. Neither parses.
3. **Commands exposed (UI + core):** `RUN CONTINUE PAUSE RESUME STOP RETRY` + global `RUN_ALL_READY`/`RUN_PHASE`. Worker 9's published `contracts/command-contract.json` declares 9 commands + 2 bulk; its `worker13_alignment.worker9_extension_required` explicitly lists `REASSIGN_MODEL`, `ADJUST_BUDGET`, `SEND_TO_REVIEW`, `RUN_ALL_READY`, `RUN_PHASE` as Worker 13's gap. Worker 9 handoff blocker `W13-CONTRACT-EXTENSION` asks for exactly this.
4. **Capability representation:** `worker9-index.mjs` derives `controls(state)` locally from packet state (unlabeled derivation); `index.mjs` expects an explicit `controls` map from the orchestrator that Worker 9 does not send. Neither labels provenance or gives unavailability reasons. `globalControls` are hard-coded `true` whenever connected.
5. **Truth behavior (good, keep):** UNKNOWN fallback for missing/unreachable orchestrator, fail-closed writes without `AUDIT_DB`, same-origin JSON write guard, server-only orchestrator token, 15s refresh (no fabricated realtime).
6. **Gaps vs. Golden Rule:** no heartbeat-staleness handling (RUNNING with stale/missing heartbeat still renders RUNNING with controls enabled); NEEDS_REVIEW not visually distinguished from verified COMPLETE; cost shows `costMicros`/`budgetConsumedMicros` without truth-state labels; provider never shown.

## Worker 9 current state (HEAD `72389be`)

Module: `nexus-v2/worker-supervisor/`

- Real routes (from `src/index.mjs`): `GET /api/workers`, `POST /api/workers/:id/commands` (`{command, payload}`), `POST /api/run-all-ready`, `POST /api/run-phase/:phase`. Queue consumer for bounded auto-continuation.
- Commands implemented in `commandTransition`: all 9 (`RUN`/`CONTINUE` via queue-or-direct launch; `PAUSE`/`RESUME`/`STOP`/`RETRY` state transitions; `REASSIGN_MODEL` (payload `model`); `ADJUST_BUDGET` (payload `budget_limit_micros`, floor = consumed); `SEND_TO_REVIEW` (NEEDS_REVIEW → PENDING)).
- `GET /api/workers` returns raw packets: **no per-command capability advertisement, no `observed_at`, no `global_controls`.** Capability discovery must be derived from the published command contract + packet state on the consumer side, or proposed as a Worker 9 change.
- Completion rule enforced: self-report can only reach `NEEDS_REVIEW`; `COMPLETE` requires `reviewDecision` approval.
- Cost: packets carry `budget_limit_micros`/`budget_consumed_micros`; `supervisor_cost_events` table exists (provider/model/amount_micros) but **no read endpoint exposes cost events**, so provider-level cost is not currently consumable by Worker 13.
- CI green at HEAD.

## Authentication boundary (verified current)

- Worker 13 sends `Authorization: Bearer ${ORCHESTRATOR_TOKEN}` on every orchestrator call (both implementations).
- Worker 9's `fetch` handler contains **no authentication or authorization check at all** — any client that can reach the service can list packets and issue all 9 commands plus bulk runs. The Test #1 finding is **still true at current HEADs**.
- Correcting this requires changing Worker 9-owned implementation (`worker-supervisor/src/index.mjs`). Per the test's ownership rule, Factory will NOT modify it; a bounded proposed patch + contract + fixture-tested reference implementation will be produced as a Worker 9 handoff artifact instead.
- Integration-side improvement possible within Worker 13 ownership: treat orchestrator 401/403 as a first-class `AUTH_REJECTED` state (distinct from unavailability), so the boundary failure is loudly visible once Worker 9 enforces auth.

## Worker 1 / Worker 8 touchpoints

- Worker 1 (Control Tower): contract `0.2.0-draft`, status Blocked on reconciliation; 8 ACRs all `needs-review`; none specifically cover the 13↔9 command/auth boundary. Relevant invariants adopted for this work: idempotency keys on state-changing commands (present), integer minor units for money (present), auditable events (present), no cross-module private-table reads (respected — Worker 13 only calls Worker 9's HTTP API).
- Worker 8 (AI Gateway): status `NEEDS_REVIEW`; defines `operator-command.schema.json` and cost/usage event schemas; handoff dependency on Worker 13 is "operator telemetry and audited command UI". Boundary respected: Worker 13 does not select providers/models directly (REASSIGN_MODEL sets a *preference* on the packet; Worker 9/8 apply qualification and policy).

## What is safely improvable without production Cloudflare credentials

- Parse/CI repair, single-entry consolidation, command coverage extension, capability derivation contract, UNKNOWN/staleness/review truthfulness, cost/budget surface with truth labels, adapter error taxonomy (incl. AUTH_REJECTED), full fixture-based test suite, CI on the integration branch.

## What remains blocked by infrastructure or other workers

- Live Worker 9 connectivity (no deployed endpoint/credential), live Cloudflare Access behavior, live D1 audit persistence, Worker 9 auth enforcement (Worker 9-owned), Worker 9 capability-advertisement endpoint (Worker 9-owned), cost-event read endpoint (Worker 9-owned), canonical re-pin of Work Packets (Worker 9/Control Tower), deployment of `/operator/*` (out of scope, no deploy).
