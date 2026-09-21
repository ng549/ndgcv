# Factory Test #6 — Functional Review (Worker 13 Command Center vs Worker 9 Contract)

Reviewer: independent functional reviewer. Verdict question: does the integrated Worker 13
command center accurately represent Worker 9's real contract and behavior?

Ground truth: `/tmp/t6-inspect/w9/src/index.mjs`, `/tmp/t6-inspect/w9/src/core.mjs`,
`/tmp/t6-inspect/w9/contracts/*.json` (HEAD 72389be).
Subject: `/home/factory-user/repos/ndgcv-factory-test-06` branch
`integration/factory-test-06-command-center`, diff `9a9aaca..HEAD`, module
`nexus-v2/operator-command-center/`.

## Verdict: ACCEPTED

No CRITICAL or HIGH findings. Route/wire fidelity, state-machine guards, payload
translation, and normalization all match Worker 9's real behavior. The one deliberate
divergence (SEND_TO_REVIEW review-state gating) is a conservative restriction in the
safe direction (disables a control Worker 9 would tolerate), not a false capability
claim. Remaining findings are MEDIUM/LOW functional bugs and gaps the tests miss.

## Verification results

1. **Route/wire fidelity — PASS.** `src/adapter.mjs:109` (GET `/api/workers`),
   `:121` (POST `/api/workers/${encodeURIComponent(id)}/commands`, body
   `{command, payload}`), `:129` (POST `/api/run-all-ready`), `:136` (POST
   `/api/run-phase/${encodeURIComponent(phase)}`). These are exactly Worker 9's four
   routes (`w9/src/index.mjs` fetch handler). Worker 9 decodes both path params
   (`decodeURIComponent`), so the adapter's encoding round-trips correctly.
2. **State machine fidelity — PASS.** `src/capability.mjs:31-46` STATE_GUARDS match
   Worker 9 `commandTransition` (`w9/src/core.mjs`) exactly:
   RUN/CONTINUE ← READY/FAILED/STOPPED (mirrors `validateLaunch`'s state check, the
   real enforcement for launch commands), PAUSE ← READY/RUNNING/FAILED, RESUME ←
   PAUSED, STOP ← READY/RUNNING/PAUSED/FAILED, RETRY ← FAILED/BLOCKED/STOPPED,
   REASSIGN_MODEL/ADJUST_BUDGET ← any state, SEND_TO_REVIEW ← NEEDS_REVIEW.
   SEND_TO_REVIEW refinement judged below (Finding 4).
3. **Payload translation — PASS.** `budgetLimitMicros → budget_limit_micros`
   (`src/adapter.mjs:90`), `model` passes through unchanged, phase is URL-encoded
   (`src/adapter.mjs:136`). Idempotency key is sent as an `x-idempotency-key` header
   (`src/adapter.mjs:50`) — see Finding 5 (Worker 9 never reads it).
4. **Normalization fidelity — PASS.** Worker 9's `GET /api/workers` returns
   `parseRow` output: `blocker` already an object-or-null, `review_state` a string,
   `heartbeat_at`, `budget_*_micros`, `preferred_model`, `module`, `scope`,
   `checkpoint_sha`. `src/core.mjs:44-88 normalizePacket` reads exactly these field
   names (`raw.blocker` at `:81`, `raw.review_state` at `:63`, `raw.heartbeat_at` at
   `:41`) with sensible camelCase fallbacks. `normalizeBlocker` (`:29-34`) correctly
   handles the parsed-object shape (`blocker.message || blocker.code`).
5. **Test suite (run by reviewer):** `npm run check` → `node --check` clean on all 5
   src files, exit 0. `npm test` → **79 tests, 77 pass, 0 fail, 2 todo, 0 cancelled**
   (node:test, ~5.3s).

## Findings

1. **MEDIUM — Double submission is not prevented client-side.**
   `src/ui.mjs` client script (`CLIENT_SCRIPT_LINES`, button `onclick` handlers around
   `src/ui.mjs:99-106`): after a successful POST the page only reloads after a 600 ms
   `setTimeout`; the clicked button is never disabled and there is no in-flight guard,
   so a fast double-click fires two POSTs with two different `request_id`s. Most
   Worker 9 transitions are idempotent, but a double RUN/CONTINUE enqueues two
   identical queue messages; the second `acquireExecution` in Worker 9 then throws
   `DUPLICATE_EXECUTION`, which is *not* in Worker 9's queue-ack allowlist
   (`w9/src/index.mjs` queue handler), so the message is retried every 30 s
   indefinitely. Tests do not cover this. Impact is bounded (requires SUPERVISOR_QUEUE
   configured; server-side rate limiter also throttles), hence MEDIUM not HIGH.

2. **MEDIUM — Enabled RUN/CONTINUE on FAILED can be pre-rejected by Worker 9's
   RETRY_LIMIT guard.** `src/capability.mjs:33` marks RUN/CONTINUE allowed from
   FAILED, but Worker 9 `validateLaunch` also rejects FAILED packets whose
   `retry_count >= max_retries` (`RETRY_LIMIT`, `w9/src/core.mjs`). The UI therefore
   can present an enabled control that deterministically 409s; the resulting 502 toast
   says only "Orchestrator returned HTTP 409". The module documents this ("state-
   eligible" only), so it is a truthful-but-incomplete prediction, not a contract
   divergence. Not blocking; noted for operator UX truthfulness.

3. **MEDIUM — Fixed 5 s adapter timeout can misreport partially-successful bulk
   runs.** `src/adapter.mjs:26` TIMEOUT_MS = 5000 applies to `run-all-ready` /
   `run-phase`, but Worker 9 processes those routes with a sequential
   `for ... await env.SUPERVISOR_QUEUE.send(...)` loop over all eligible packets
   (`w9/src/index.mjs`). With many ready workers the upstream can keep working after
   the client aborts; the command center then audits outcome `REJECTED`/TIMEOUT
   (`src/index.mjs` commandGlobal catch) although Worker 9 accepted some or all
   packets — an audit-truthfulness gap for bulk actions.

4. **LOW — SEND_TO_REVIEW review-state gating is a deliberate, safe-direction
   restriction, not a faithful mirror.** Worker 9 `commandTransition` requires only
   `state === NEEDS_REVIEW`; it would accept a re-send while `review_state` is
   PENDING (idempotently re-setting PENDING) or even APPROVED. `src/capability.mjs:99-107`
   additionally disables the control unless reviewState is NOT_SENT or REJECTED.
   Judgment: this is a truthful *restriction* (it disables, never wrongly enables)
   and matches the completion rule that an APPROVED packet should be COMPLETE anyway;
   acceptable divergence, disclosed in the module comments. Not a misrepresentation
   of Worker 9 behavior to the operator's detriment.

5. **LOW — Idempotency key is forwarded but is a no-op upstream.**
   `src/adapter.mjs:50` sends `x-idempotency-key`, but Worker 9 never reads that
   header; its real dedupe is the DB-derived key
   `worker_id:v{packet_version}:{checkpoint_sha}` (`makeIdempotencyKey`,
   `w9/src/core.mjs`). The header is harmless and future-proofing, but the audit
   trail's `request_id` cannot be correlated with any Worker 9 artifact, slightly
   weakening the claimed end-to-end idempotency story.

6. **LOW — UI cannot express the ADJUST_BUDGET "== consumed" boundary exactly.**
   Worker 9 allows `budget_limit_micros >= budget_consumed_micros` (`w9/src/core.mjs`
   ADJUST_BUDGET). The client converts dollars via `Math.round(dollars*1000000)`
   (`src/ui.mjs:104`) and the input has `step="0.01"`, so micros-level precision
   (e.g. setting the limit exactly equal to a non-cent-aligned consumed value) is
   unreachable; `parseFloat` float error is correctly absorbed by `Math.round` for
   realistic values. Server-side validation (`src/index.mjs:151`) checks only
   safe-integer and `>= 0`, correctly delegating the consumed-boundary to Worker 9's
   409. Behavior matches; only precision of the happy path is limited.

7. **LOW — Workers not in the hardcoded SEED_WORKERS list are silently invisible.**
   `src/index.mjs` builds views only for the 7 seeded ids; any extra packet returned
   by Worker 9 is fetched but dropped (`byId` entries never rendered), and
   `deriveGlobalControls`' `hasReady` is computed over the filtered seed list, so
   RUN_ALL_READY can render disabled ("no_ready_workers") while Worker 9 actually has
   ready non-seed workers. Seed list happens to cover the current fleet, so impact is
   latent, but it is a fidelity gap if Worker 9's roster changes.

8. **LOW — Adapter response fields `upstreamStatus`/`commandId` are always null.**
   `src/index.mjs` audits and returns `result.upstreamStatus ?? null` /
   `result.commandId ?? null`, but Worker 9's command response is
   `{accepted, worker|result|queued}` (`w9/src/index.mjs handleCommand`) — neither
   field exists. Dead fields; audit `ACCEPTED` detail is therefore always null-valued.
   Harmless but misleading in the audit schema.

9. **LOW — Unhandled audit-DB failure mid-request yields an unshaped 500.**
   If `env.AUDIT_DB.prepare(...).run()` throws after the availability pre-check
   (`src/index.mjs:166-168`), the exception propagates out of `commandWorker`/
   `commandGlobal` with no try/catch, returning Workers' default 500 and no audit
   record of the attempt. Small audit-outcome gap; presence/absence is checked, but
   runtime DB errors are not.

## Summary

The command center is a faithful client of Worker 9's real contract: routes, wire
shapes, payload key translation, state guards, and packet normalization all check out
against ground truth, and the full suite passes (77/79, 2 todo, 0 fail). The nine
findings above are robustness/precision gaps around double submission, bulk-action
timeouts, retry-limit prediction, and audit completeness — none of them cause the UI
to claim a capability Worker 9 would deny. **ACCEPTED.**

---

## Round 2 — Re-review of repair commit f19ff18

Verdict: **ACCEPTED.** All seven repaired items verified against source and Worker 9
ground truth; suite re-run clean; no regressions found. Two residual LOW notes below.

### Verification of repairs

1. **F1 double submission — FIXED.** `src/ui.mjs` CLIENT_SCRIPT_LINES (~`:104-108`):
   `b.disabled=true` is set synchronously on click; the button is re-enabled on
   client-side validation failure (`b.disabled=false` before the early `return` for
   missing model / invalid budget) and in the `post(...).catch` path. On success the
   page reloads after 600 ms, so the disabled state never strands. Confirmed.
2. **F2 RETRY_LIMIT mis-prediction — FIXED correctly.** `src/capability.mjs:110-124`:
   RUN/CONTINUE are disabled with reason `retry_limit_reached` only when
   `status === "FAILED"` and both `view.retryCount`/`view.maxRetries` are safe
   integers and `retryCount >= maxRetries`. This mirrors Worker 9 `validateLaunch`
   (`(packet.retry_count||0) >= (packet.max_retries ?? 3) && packet.state === "FAILED"`
   → RETRY_LIMIT). RETRY itself stays enabled from FAILED/BLOCKED/STOPPED, matching
   `commandTransition` RETRY which has no retry-count guard. `normalizePacket` now
   surfaces `retryCount`/`maxRetries` (`src/core.mjs:83-84`). Confirmed.
3. **F3 timeout audit — FIXED on both paths.** `src/index.mjs` commandWorker catch
   (~`:198-201`) and commandGlobal catch (~`:233-236`) both map
   `error.code === "TIMEOUT"` to audit outcome `TIMEOUT_UNKNOWN` instead of
   `REJECTED`, with comments explaining Worker 9 may still be processing. Confirmed.
4. **F7 unseeded workers dropped — FIXED.** `src/index.mjs` getWorkerState (~`:110-116`)
   now appends any live packet whose id is not in SEED_WORKERS, with
   `deriveControls` applied, and `deriveGlobalControls(true, workers)` runs over the
   full merged list, so RUN_ALL_READY readiness reflects the real roster. Confirmed.
5. **UX-F1 budget-exhaustion prediction — FIXED, no over-disable.**
   `src/capability.mjs:113-116` disables RUN/CONTINUE with
   `budget_exhausted_predicted` only when `view.cost.remainingMicros === 0`.
   `normalizePacket` computes `remainingMicros = max(0, limit - consumed)` and leaves
   it `null` when either input is missing, and `null === 0` is false, so UNKNOWN cost
   stays eligible — exactly mirroring `validateLaunch`'s
   `remainingBudget(packet) <= 0 → BUDGET_EXHAUSTED` without fabricating a denial on
   absent evidence. Confirmed.
6. **Security repairs — CONFIRMED.** `src/index.mjs:156` rejects model ids longer
   than 128 chars with `MODEL_TOO_LONG`; the auth failure boundary (~`:249-252`)
   only echoes `error.message` when it matches `/^[A-Z_]+$/` (machine codes), else
   returns the literal `auth_failed`, so attacker-controlled token fragments cannot
   leak through `detail`. Confirmed.
7. **requested_by/request_id in command body — INERT, no wire violation.**
   `src/adapter.mjs:117-134` adds optional `requested_by`/`request_id` alongside
   `{command, payload}`. Worker 9's handler (`w9/src/index.mjs`) destructures exactly
   `const { command, payload = {} } = await request.json()` and ignores all other
   keys, so the extra fields are dropped upstream with no behavioral effect.
   Confirmed inert.
8. **Suite re-run (by reviewer):** `npm run check` clean (node --check on all 5 src
   files). `npm test` → **87 tests, 85 pass, 0 fail, 2 todo, 0 cancelled** (~5.3 s),
   up from 79/77 with the new repair-coverage tests.

### Regression hunt — findings

10. **LOW — Global buttons still lack the double-submit guard.** The F1 fix covers
    per-worker command buttons only; `runAll.onclick` and `phaseBtn.onclick`
    (`src/ui.mjs` CLIENT_SCRIPT_LINES ~`:112-118`) never disable the clicked global
    button, so a fast double-click on RUN ALL READY / RUN PHASE still fires two
    POSTs. Impact is smaller than F1 (bulk routes are re-entrant queue sends, and
    the rate limiter throttles), but the repair is asymmetric.
11. **LOW — Retry-limit prediction under-disables when `max_retries` is absent.**
    Worker 9 defaults `max_retries` to 3 in `validateLaunch`; the new guard requires
    `Number.isSafeInteger(view.maxRetries)`, so for a packet row lacking
    `max_retries` the UI keeps RUN/CONTINUE enabled from FAILED even at
    `retry_count >= 3` and Worker 9 will 409. Safe direction (no false denial) and
    an edge case, but the prediction is not yet complete for defaulted rows.

No other regressions detected: state guards, payload translation, normalization,
auth boundary, and phase/run-all wiring are unchanged in behavior; the new
auto-refresh skip selector (`#phase:not(:placeholder-shown), .cmd-input:not(...)`)
correctly matches all three inputs because each renders with a `placeholder`
attribute.
