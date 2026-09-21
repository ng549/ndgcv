# Factory Test #6 — UX / Truth Review (independent)

Reviewer role: UX/TRUTH REVIEWER, independent of implementers.
Question under review: **can this UI mislead Nicolas about worker state, capability, cost, or review status — by commission or omission?**
Method: code read of `src/ui.mjs`, `src/capability.mjs`, `src/core.mjs`, `src/index.mjs` against `reports/factory-test-06/BASELINE.md`, plus live browser verification (session `t6-ux-review`) of the real `renderPage`/`normalizePacket`/`deriveControls` pipeline served fixture-backed: connected instance on `:3615` (copy of the harness), disconnected instance on `:3614` (`--disconnected`), mobile emulation at 390×844 DPR2 via CDP.

## Verdict: ACCEPTED — with 7 findings (2 MEDIUM, 5 LOW), none blocking

The Golden Rule holds on every dimension that fabricates *data*: no invented dollars, provider, model, status, or review state anywhere. UNKNOWN renders as UNKNOWN with an explicit qualifier; stale RUNNING collapses; NEEDS_REVIEW is flagged unverified; cost is labeled supervisor-recorded. The findings below are capability *prediction* gaps and affordance/legibility issues, not fabrications.

## Verified truthful (no findings)

- **UNKNOWN (no evidence):** Worker 7 renders status UNKNOWN + qualifier "no runtime evidence", all facts UNKNOWN, all controls disabled. (`src/core.mjs` `unknownWorker`; `src/ui.mjs:36-37`)
- **Stale-RUNNING collapse:** Worker 12 (reported RUNNING, heartbeat 30 min old) renders UNKNOWN + "reported RUNNING · stale heartbeat", every control disabled with visible reason `stale_heartbeat`. (`src/capability.mjs:51-56`, `src/ui.mjs:39-40`)
- **NEEDS_REVIEW:** Worker 9 renders NEEDS_REVIEW + "completion claim unverified"; `SEND_TO_REVIEW` disabled with `review_state_pending_rejects_send_to_review`. (`src/ui.mjs:42-44`)
- **COMPLETE:** renders bare status with no qualifier; per Worker 9's completion rule (COMPLETE requires review approval) the unqualified status is itself accurate.
- **BLOCKED:** Worker 2 shows blocker text "Gateway returned 500 three times" in the dedicated Blocker fact, styled visibly (`color:#ffc8b7`).
- **Cost:** consumed/limit/remaining consistent ($1.25/$5.00/$3.75 and $2.00/$2.00/$0.00); remaining labeled "(supervisor-recorded)"; UNKNOWN triplet when absent. No fabricated dollars. (`src/core.mjs:40-47`)
- **Provider:** always UNKNOWN, never fabricated (`provider: null` in both normalizers). REASSIGN_MODEL tooltip states preference-only semantics (but see F4).
- **Toast wording:** observed live — "RUN request accepted". Matches the server's 202/ACCEPTED semantics (`src/index.mjs` returns `accepted:true` only after Worker 9 accepts). It does **not** claim execution. PASS.
- **Connection badge / observed-at:** real worker sends `cache-control: no-store` on the page (`src/index.mjs` GET `/operator` handler) and the page reloads every 15s; worst-case badge staleness ≈15s, and the "Observed: …" timestamp is rendered. Acceptable mitigation.
- **Overclaim scan:** no "executed"/"secure"/"guaranteed" class wording in `ui.mjs`/`index.mjs`. "Private operator surface", "ORCHESTRATOR CONNECTED", footer capability-source notice are all accurate.
- **Fail-closed asymmetry (noted, not a defect):** on stale/UNKNOWN workers even packet-level mutations (REASSIGN_MODEL, ADJUST_BUDGET — contract `*` guards) are disabled with `stale_heartbeat`. Conservative; cannot mislead into action.

## Findings

### F1 — MEDIUM: READY worker with $0.00 remaining still offers an enabled RUN/CONTINUE
Evidence: `src/capability.mjs:32-34` (`RUN`/`CONTINUE` guards are state-only; comment admits budget guard is Worker 9-only); live render of Worker 13 (READY, consumed $2.00 / limit $2.00 / **remaining $0.00**) shows RUN, CONTINUE, PAUSE, STOP enabled. Worker 9 would reject with 409 `BUDGET_EXHAUSTED`. The truthful $0.00 is displayed adjacent to the enabled button, and the failure would be loud (409 → error toast), so this is a capability *mis-prediction*, not a data fabrication — hence MEDIUM, not HIGH. Same class: `ADJUST_BUDGET` is always enabled with no hint that Worker 9 enforces floor = consumed.
Suggested fix: `deriveControls` already receives `view.cost`; gate RUN/CONTINUE (and caption ADJUST_BUDGET) when `remainingMicros === 0`.

### F2 — MEDIUM: disabled GLOBAL controls expose their "why" only via `title` on a disabled button — effectively invisible
Evidence: `src/ui.mjs` `renderPage` global block — `RUN ALL READY` / `RUN PHASE` get `title="${reason}"` but no `.reason` caption (contrast with per-worker `commandButton`, `src/ui.mjs:66`). Verified live on the disconnected instance: `runAllTitle="orchestrator_not_connected"`, `visibleReasonNearGlobal:false`. Chrome suppresses tooltips on disabled buttons, and touch devices have no hover — so in the two states where the reason matters most (disconnected, no-ready-workers), Nicolas sees a dead button with no explanation. Per-worker controls do this correctly; globals should render the same visible caption.

### F3 — LOW-MEDIUM: 15s auto-reload silently destroys in-flight operator input
Evidence: `src/ui.mjs` client script last line `setInterval(function(){location.reload()},15000)`. Verified live: typed `phase-9` into the Phase field; after the reload the value was gone, no warning, no preservation. Same applies to per-worker model-id and budget inputs. Not a truth violation (nothing false is displayed) but an operator mid-typing a budget adjustment loses work every 15s. Suggest: skip reload while any input is focused/dirty, or restore field values across reload.

### F4 — LOW: REASSIGN_MODEL "preference-only" semantics are tooltip-only
Evidence: `src/ui.mjs:54` — the accurate disclaimer ("Sets the preferred model on the work packet only; Worker 9 and the AI Gateway still qualify and route") exists solely as a `title` attribute, shown only on hover on an *enabled* desktop button. On mobile it is undiscoverable, and the bare button label "REASSIGN_MODEL" reads stronger than the semantics. A short visible caption (as done for disabled reasons) would close it.

### F5 — LOW: disabled-state affordance is opacity-only (0.34)
Evidence: `src/ui.mjs` CSS `button:disabled{opacity:.34;cursor:not-allowed}` (measured `disabledOpacity:"0.34"`). For per-worker controls this is rescued by the adjacent reason captions (F2 covers globals, which have neither on touch). Judged acceptable for workers, insufficient for globals.

### F6 — LOW: reason captions at 9.92px are at the legibility floor
Evidence: measured `.reason` computed font-size 9.92px, color `rgb(143,166,198)` on dark navy. Present and readable in screenshots at 390px, but below comfortable body-text size for the exact text that carries the "why". Consider ≥11px.

### F7 — LOW: command/budget inputs are 31px tall (< 42px touch target)
Evidence: measured `inputMinH:31` at 390px (`min-height:42px` is set on buttons and the global phase input, but `.cmd-input` has only `padding:8px`). Buttons all pass (min 42×104px; measured none smaller). Minor mobile ergonomics gap on the model-id / budget fields.

## Harness fidelity note (not a source defect)

In the fixture harness, seed workers with no packet (e.g. Worker 7) skip `deriveControls`, so their disabled buttons render without the `status_unknown` caption. The real `src/index.mjs` `getWorkerState` runs `deriveControls` on *every* seed including `unknownWorker` fallbacks, so production renders the caption. No action on the module; harness-only discrepancy.

## Layout verification summary

- 390×844 (DPR2, mobile emulation): no horizontal overflow (`scrollW == clientW == 390`, zero overflowing elements), single-column cards, captions wrap (`overflow-wrap:anywhere`), screenshot reviewed.
- Desktop 1280px: 3-column grid, no overflow.
- Touch targets: all 65 buttons ≥42px height (min measured 42×104); inputs are the only sub-42px targets (F7).

## What could NOT mislead Nicolas (explicit negatives)

- No fabricated cost, provider, model, heartbeat, commit, or checkpoint anywhere — every absent fact renders UNKNOWN.
- No enabled control claims success it can't back: toasts stop at "request accepted"; denials surface server reasons.
- COMPLETE is never self-declared in the UI; NEEDS_REVIEW carries its unverified qualifier; review state is a separate fact.
- Disconnected state removes all capability claims and names the failure (`DISCONNECTED — NOT_CONFIGURED`).

## Required follow-ups (non-blocking)

1. F1: budget-aware gating (or caption) for RUN/CONTINUE at zero remaining; floor hint for ADJUST_BUDGET.
2. F2: visible reason captions for disabled global controls.
3. F3: preserve/suspend reload around dirty inputs.
4. F4/F6/F7: visible preference-only caption for REASSIGN_MODEL; bump caption font and input heights.

---

# Round 2 — Re-review of repairs (commit f19ff18)

Method: diff read of f19ff18, then live browser verification (session `t6-ux-review2`) against my own harness copies restarted after the commit — connected on `:3615`, disconnected `--disconnected` on `:3614`, plus CDP 390×844 DPR2 mobile emulation. Orchestrator's `:3613` instance untouched.

## Round 2 verdict: ACCEPTED

Every Round-1 finding is repaired as claimed, with truthful (packet-derived, not fabricated) semantics, and no new misleading behavior introduced. Two new LOW residual items noted below; neither blocks.

### Verification per finding

1. **F1 — REPAIRED, verified live.** Worker 13 (READY, $2.00/$2.00 consumed/limit) now renders RUN and CONTINUE **disabled** with visible caption `budget_exhausted_predicted` on both (`src/capability.mjs` launch-guard block mirroring Worker 9 `validateLaunch`; gated on `remainingMicros === 0` exactly, so UNKNOWN cost — `remainingMicros: null` — does not falsely trigger: fail-open only where evidence is absent, and Worker 9 remains the loud final authority). Bonus truthful addition: `retry_limit_reached` at the FAILED retry ceiling, also packet-derived.
   - **Residual gap (judged ACCEPTABLE, LOW):** no ADJUST_BUDGET floor hint (Worker 9 rejects limits below consumed with 409). Acceptable because the 409 surfaces as a loud error toast, the common operator direction is *raising* a limit, and the caption space is already carrying the preference/floor semantics honestly. Not a truth violation.
2. **F2 — REPAIRED, verified live.** Disconnected instance renders visible `.reason` captions "orchestrator_not_connected" directly under both RUN ALL READY and RUN PHASE (screenshot-verified at desktop width; captions are in normal flow, so they render on touch devices too). Tooltips retained as redundant channel.
3. **F3 — REPAIRED, verified live.** Typed `phase-9` into the Phase field, waited 17s: value intact, no reload. Guard is `:not(:placeholder-shown)` on `#phase` and `.cmd-input` (`src/ui.mjs` client script), which covers all three in-flight input types (phase/model/budget). Once fields are cleared, refresh resumes.
4. **F4 — REPAIRED, verified live.** Enabled REASSIGN_MODEL on Worker 13 shows a persistent caption "preference only — Worker 9 + AI Gateway qualify the route" (`src/ui.mjs` commandButton; renders only when no disabling reason caption is present, i.e. exactly when enabled). Accurate wording, matches the Worker 9/8 boundary.
5. **F6/F7 — REPAIRED, spot-checked live.** `.reason` computed at 10.88px (0.68rem); `.cmd-input` min-height 42px, measured 42px; all inputs now meet the 42px touch target at 390px; no horizontal overflow re-introduced (scrollW == 390).

### Regression hunt — results

- **Double-submit guard (new):** button disables on click; on simulated network failure (`fetch` reject) the button **re-enables** and the error toast shows the message — verified live (`duringDisabled:true`, `reEnabledAfterError:true`). On success the page reloads after 600ms, so no trapped-disabled state. PASS.
- **Reload-guard staleness (new LOW):** while any input holds text, the 15s refresh is suppressed indefinitely, so the badge/statuses/"Observed" timestamp can go arbitrarily stale during a long editing session. Judged LOW: the "Observed: …" timestamp remains visible for cross-checking, the guard only engages on deliberate operator input, and all conservative states (UNKNOWN/stale-collapse) degrade safely. Suggest (optional) a "refresh paused while editing" hint.
- **Inconsistency (new LOW):** the double-submit guard was added to per-worker commands (`bindCommands`) but not to the global RUN ALL READY / RUN PHASE handlers (`bindGlobal`), which can still double-fire during the 600ms pre-reload window. Worker 9 idempotency keys make this harmless upstream; cosmetic only.
- No newly misleading text introduced in the repair diff; captions added are all accurate.

### Round 2 residual items (non-blocking)

1. ADJUST_BUDGET floor=consumed hint (F1 residual, LOW).
2. "Refresh paused while editing" affordance (LOW).
3. Double-submit guard for global buttons (LOW).

Files inspected: `src/capability.mjs`, `src/ui.mjs`, `src/index.mjs` (diff), harness behavior on `:3614`/`:3615`. Evidence screenshots: `/tmp/t6-r2-disc.png`, `/tmp/t6-r2-mobile.png`.
