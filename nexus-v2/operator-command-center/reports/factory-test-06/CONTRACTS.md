# Factory Test #6 — Frozen Interface Contracts

Frozen before parallel worker dispatch. Workers A/B/C implement against these exact
signatures and shapes. Changes require orchestrator approval and a note in this file.

All code is plain ESM JavaScript (`.mjs`), Node 22+/Workers-compatible (no Node-only
APIs in `src/` except where noted), zero runtime dependencies.

## Shared vocabulary

- `ACTIONS` (9): `RUN CONTINUE PAUSE RESUME STOP RETRY REASSIGN_MODEL ADJUST_BUDGET SEND_TO_REVIEW`
- `GLOBAL_ACTIONS` (2): `RUN_ALL_READY RUN_PHASE`
- Command payloads: `REASSIGN_MODEL` → `{ model: string }`; `ADJUST_BUDGET` → `{ budgetLimitMicros: integer }`; all others → `{}`.
- Worker 9 wire commands use snake_case payload keys (`budget_limit_micros`); the operator API uses camelCase and the adapter translates.
- Money is integer micro-USD. Never fabricated: absent evidence → `null` → rendered `UNKNOWN`.

## WorkerView (normalized per-worker object; camelCase)

Produced by `core.normalizePacket` / `core.unknownWorker`; consumed by capability, UI, and `/operator/api/workers`.

```jsonc
{
  "id": "string",
  "name": "string",
  "status": "READY|RUNNING|PAUSED|STOPPED|WAITING_ON_DEPENDENCY|BLOCKED|FAILED|NEEDS_REVIEW|COMPLETE|UNKNOWN",
  "reportedState": "string|null",        // raw Worker 9 packet state before staleness override
  "statusEvidence": "string",            // e.g. "worker9-packet", "none"
  "currentTask": "string|null",
  "model": "string|null",
  "provider": "string|null",             // always null today (Worker 9 exposes none) → UI shows UNKNOWN
  "lastHeartbeat": "string|null",        // ISO date-time
  "heartbeatFresh": "boolean",           // false when missing or older than HEARTBEAT_STALE_MS
  "cost": {
    "consumedMicros": "integer|null",
    "limitMicros": "integer|null",
    "remainingMicros": "integer|null",
    "truthState": "SUPERVISOR_RECORDED|UNKNOWN"
  },
  "branch": "string|null",
  "lastCheckpoint": "string|null",
  "latestCommit": "string|null",
  "blocker": "string|null",
  "reviewState": "NOT_SENT|PENDING|APPROVED|REJECTED|UNKNOWN",
  "controls": { "RUN": { "allowed": false, "reason": "string|null" } /* …all 9 ACTIONS */ }
}
```

`controls` is populated ONLY by `capability.deriveControls`. A control is enabled in the
UI iff `allowed === true`. `reason` explains unavailability where known.

## GET /operator/api/workers response

```jsonc
{
  "connected": "boolean",
  "reason": "string|null",               // null when connected; else NOT_CONFIGURED|TIMEOUT|UNAVAILABLE|AUTH_REJECTED|HTTP_<n>|INVALID_PAYLOAD
  "observedAt": "string|null",
  "contractVersion": "worker9-command-contract-v1",
  "capabilitySource": "derived-from-worker9-command-contract-v1",
  "workers": [WorkerView],
  "globalControls": {
    "RUN_ALL_READY": { "allowed": "boolean", "reason": "string|null" },
    "RUN_PHASE":     { "allowed": "boolean", "reason": "string|null" }
  }
}
```

## src/core.mjs (Worker B extends; existing exports preserved)

```js
export const STATUS              // existing 10-state list (keep)
export const ACTIONS             // EXTEND to the 9 above
export const GLOBAL_ACTIONS      // NEW: ["RUN_ALL_READY","RUN_PHASE"]
export function normalizeStatus(value)              // keep behavior
export function normalizePacket(raw = {}, now = Date.now())  // NEW name/behavior: W9 packet → WorkerView without controls (controls: {})
export function unknownWorker(id, name, branch = null)       // keep + new WorkerView shape (status UNKNOWN, cost truthState UNKNOWN)
export function isSameOriginWrite(request)          // keep
export function safeMoney(micros)                   // keep
// REMOVED: normalizeWorker, commandSupported (superseded by normalizePacket + capability.deriveControls)
```

## src/capability.mjs (Worker A, new)

```js
export const CONTRACT_VERSION = "worker9-command-contract-v1";
export const HEARTBEAT_STALE_MS = 10 * 60 * 1000;   // matches Worker 9 lease duration
export function heartbeatFresh(lastHeartbeat, now = Date.now()) // boolean; missing → false
export function effectiveStatus(reportedState, lastHeartbeat, now = Date.now())
  // → { status, reportedState, stale } — RUNNING with stale/missing heartbeat ⇒ status UNKNOWN, stale true
export function deriveControls(workerView, now = Date.now())
  // → { ACTION: { allowed, reason } } for all 9; pure derivation from Worker 9 command-contract v1
  //   state machine; all false with reason when status UNKNOWN/stale/heartbeat missing for runtime commands
export function deriveGlobalControls(connected /*boolean*/, workers /*WorkerView[]*/)
  // → { RUN_ALL_READY: {allowed, reason}, RUN_PHASE: {allowed, reason} }
```

State machine mirrored from Worker 9 `commandTransition` (contract v1):
- RUN/CONTINUE: from READY, FAILED, STOPPED
- PAUSE: from READY, RUNNING, FAILED
- RESUME: from PAUSED
- STOP: from READY, RUNNING, PAUSED, FAILED
- RETRY: from FAILED, BLOCKED, STOPPED
- REASSIGN_MODEL / ADJUST_BUDGET: any non-UNKNOWN state (packet-level mutations)
- SEND_TO_REVIEW: from NEEDS_REVIEW with reviewState NOT_SENT or REJECTED
- RUNNING requires fresh heartbeat, else status collapses to UNKNOWN and all controls false (reason "stale_heartbeat")

## src/adapter.mjs (Worker A, new)

```js
export class OrchestratorError extends Error { /* .code, .httpStatus|null */ }
export const ERROR_CODES = ["NOT_CONFIGURED","TIMEOUT","UNAVAILABLE","AUTH_REJECTED","HTTP_ERROR","INVALID_PAYLOAD"];
export async function listPackets(env)        // → { packets: Array<rawPacket>, observedAt: string } ; validates shape, throws OrchestratorError
export async function sendWorkerCommand(env, workerId, command, payload /*camelCase*/, requestId)
export async function runAllReady(env, requestId)
export async function runPhase(env, phase, requestId)
// env: { ORCHESTRATOR_BASE_URL, ORCHESTRATOR_TOKEN }; 5s timeout; Bearer token server-side only;
// 401/403 → OrchestratorError("AUTH_REJECTED"); other !ok → HTTP_ERROR with .httpStatus;
// fetch failure → UNAVAILABLE; abort → TIMEOUT; bad JSON/shape → INVALID_PAYLOAD.
```

## src/ui.mjs (Worker B, new)

```js
export function renderPage(model) // model = /operator/api/workers response body; → full HTML string
// Pure function. Dark, mobile-first (44px+ touch targets, responsive grid).
// Renders: connection badge (with reason), global controls (RUN PHASE disabled until phase input non-empty),
// per-worker cards: status badge (+ "reported X · stale" / "NEEDS_REVIEW — unverified claim" qualifiers),
// facts (task, model, provider, heartbeat, cost consumed/limit/remaining with truthState label, branch,
// checkpoint, commit, blocker, review state), 9 command buttons with disabled tooltips from controls reasons.
// REASSIGN_MODEL and ADJUST_BUDGET carry small inline inputs. All user-derived strings HTML-escaped.
// Client JS must not contain template literals (nested-backtick defect); use string concatenation.
```

## src/index.mjs (Worker B, rewrite; sole Worker entry)

```js
export default { async fetch(request, env) }
```
Routes (all under `/operator`, 404 otherwise): `GET /operator[/]` → page; `GET /operator/api/workers`;
`POST /operator/api/workers/:id/command`; `POST /operator/api/global`.
Auth: Cloudflare Access JWT (signature via team certs, `iss`, `aud`, `exp`, operator email) + rate-limit
binding; fail closed. D1 audit on every command attempt (fail closed when `AUDIT_DB` missing).
`src/worker9-index.mjs` is DELETED; `wrangler.jsonc` `main` → `src/index.mjs`; package `check` covers all `src/*.mjs`.

## Worker C deliverables (fixtures + tests; test file names fixed)

- `fixtures/worker9-server.mjs` — in-process fake Worker 9 (node:http) with per-test scriptable responses (ok, 500, timeout-sim, malformed JSON, wrong shape, 401/403), packet scenarios: READY/RUNNING-fresh/RUNNING-stale/PAUSED/FAILED/BLOCKED/NEEDS_REVIEW(reviewState PENDING)/COMPLETE, zero-budget, unknown worker id.
- `fixtures/packets.mjs` — packet builders.
- `handoff/WORKER-9-AUTH-PROPOSAL.md` + `handoff/worker9-auth-reference.mjs` — PROPOSED Worker 9 change (labeled proposal, not integrated): Bearer validation, constant-time compare, 401 vs 403, audit event, no behavior change when token unset-but-required config documented.
- Tests (node:test, no deps): Worker C owns `tests/adapter.test.mjs`, `tests/integration.test.mjs`, `tests/worker9-auth-proposal.test.mjs`. (Worker A owns `tests/capability.test.mjs`; Worker B owns `tests/core.test.mjs` and `tests/ui.test.mjs`.)
- Coverage of the 24 required areas (mapping table in each test file header comment).

## Hard rules for all workers

- Do NOT modify anything outside `nexus-v2/operator-command-center/` EXCEPT Worker B also updates
  `.github/workflows/worker13-command-center-check.yml` (add integration branch trigger) — no, workflow
  change is ORCHESTRATOR-owned; workers must not touch `.github/`.
- Do NOT touch `nexus-v2/worker-supervisor/**`, `nexus-v2/ai-gateway/**`, `nexus-v2-control-tower/**`,
  `nexus-v2/NEXUS-V2-CANONICAL.json`.
- Do NOT git commit/push. Orchestrator commits.
- Golden Rule: no fabricated capability, cost, provider, or status. Absent evidence → UNKNOWN/disabled.
