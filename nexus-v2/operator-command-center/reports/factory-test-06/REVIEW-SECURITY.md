# Factory Test #6 — Independent Security Review

Reviewer: independent security reviewer (not an implementer).
Scope: `git diff 9a9aaca..HEAD`, module `nexus-v2/operator-command-center/`
(`src/index.mjs`, `src/adapter.mjs`, `src/ui.mjs`, `src/core.mjs`, `src/capability.mjs`,
`handoff/`, `fixtures/`, `tests/`).

## Verdict: ACCEPTED

No CRITICAL or HIGH findings. All MEDIUM/LOW items are hardening notes, not merge blockers.

---

## Scope 1 — Operator auth (Cloudflare Access JWT), `src/index.mjs`

Verified sound:

- Signature verification pins `alg === "RS256"` and requires `kid` (`index.mjs:44`); key imported as
  `RSASSA-PKCS1-v1_5`/SHA-256 from `https://<team>/cdn-cgi/access/certs` with `kid` match (`index.mjs:47-52`). No alg confusion.
- `iss`, `exp` (`exp <= now` rejected), and `aud` (string or array, must contain `env.ACCESS_AUD`) enforced (`index.mjs:54-56`).
- Email authorization: case-insensitive equality against `env.OPERATOR_EMAIL`, mismatch → 403 (`index.mjs:63-67`).
- Fail-closed: missing `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD`/`OPERATOR_EMAIL`/token → throw before any verification shortcut (`index.mjs:40`).
- Rate limiting fail-closed: missing `OPERATOR_RATE_LIMITER` binding → 503, exceeded → 429 (`index.mjs:72-81`).
- Auth error responses contain only generic codes (`AUTH_REQUIRED`/`FORBIDDEN` + static message); no JWT material echoed.

**Finding 1 (LOW):** `nbf`/`iat` are not validated (`index.mjs:54-56`). Cloudflare Access sets `exp` correctly, so impact is theoretical; add `nbf` check for completeness.

**Finding 2 (LOW):** The auth catch returns `detail: error.message` (`index.mjs:252`). For malformed base64/JSON, V8's `JSON.parse`/`atob` messages can include a character from the attacker-supplied token. Attacker-controlled input only — no secret leak — but returning a static `detail` would be cleaner.

## Scope 2 — Command authorization

Verified sound:

- Same-origin write guard requires `Origin === url.origin`, `Sec-Fetch-Site` absent-or-`same-origin`, and JSON content type (`core.mjs:118-125`). Fail-closed for header-less non-browser clients. Applied to both write endpoints (`index.mjs:147`, `index.mjs:196`).
- `AUDIT_DB` fail-closed with `controls_disabled: true` → 503 (`index.mjs:148`, `index.mjs:197`).
- Action whitelist: `ACTIONS`/`GLOBAL_ACTIONS` from `core.mjs`, uppercase-normalized, else 400 (`index.mjs:152-153`, `index.mjs:200-201`).
- Capability re-derived server-side on every write via `getWorkerState` → `deriveControls` before forwarding (`index.mjs:156-164`); UI gating is defense-in-depth only. Unknown worker id → `control == null` → DENIED 409. Disconnected → DENIED.
- `ADJUST_BUDGET`: `Number.isSafeInteger` and `>= 0` enforced (`index.mjs:133-136`).
- `RUN_PHASE`/`workerId` reach the upstream URL only via `encodeURIComponent` (`adapter.mjs:120`, `adapter.mjs:141`); no path injection.

**Finding 3 (LOW):** `REASSIGN_MODEL` `model` has no length/charset bound (`index.mjs:126-131`). An authenticated operator could push an arbitrarily large string upstream and into the audit row. Operator-only surface, but a length cap (e.g. 128 chars) is cheap.

**Finding 4 (LOW):** `ADJUST_BUDGET` has no upper bound. An operator can set `Number.MAX_SAFE_INTEGER` micros (~$9e9). Operator-only and Worker 9 is final authority; consider a documented ceiling.

## Scope 3 — Secrets

Verified sound:

- `ORCHESTRATOR_TOKEN` is read from `env` only inside `adapter.mjs:requireConfig` and placed only in the upstream `authorization` header (`adapter.mjs:46-49`). It never appears in `OrchestratorError` messages (codes + HTTP status only), audit rows (parameterized, detail contains payload/reason/status only), `console.log` audit lines, or any Response body. `reasonFromError` (`index.mjs:86-92`) maps to codes, never messages.
- Fixtures record `tokenPresent`/`tokenLast4` only (`fixtures/worker9-server.mjs:60-66`) — last-4 is an industry-accepted debugging pattern; acceptable.
- Diff scan: only dummy test tokens (`tests/adapter.test.mjs:43` `"**************************"`, `tests/worker9-auth-proposal.test.mjs:22` `"test-supervisor-secret-..."`). No real secrets committed.

## Scope 4 — Injection / XSS (`src/ui.mjs`)

Verified sound:

- Every worker-controlled field (`id`, `name`, `status`, `currentTask`, `model`, `branch`, `blocker`, `lastHeartbeat`, `checkpoint`, `reviewState`, disconnect `reason`, control `reason` in `title` and caption) passes through `escapeHtml` including inside attribute contexts (`ui.mjs:11-15`, `commandButton`/`workerCard`).
- Client script uses `textContent` for toast, `dataset` reads, `encodeURIComponent` for URL building; no `innerHTML` sink anywhere.
- CSP `default-src 'self'` with `frame-ancestors 'none'`, `base-uri 'none'`, `nosniff`, `X-Frame-Options: DENY` (`index.mjs:262-265`). `script-src 'unsafe-inline'` is the known/accepted trade-off; no escaping bug found that would defeat it.

**Finding 5 (LOW):** The client script interpolates `dataset.worker` into a `querySelector` attribute selector (`ui.mjs:112`: `'input[...][data-worker="'+id+'"]'`). `escapeHtml` protects HTML parsing, but `dataset` returns the decoded value, so an orchestrator-supplied `worker_id` containing `"` or `\` would produce an invalid/over-broad selector (onclick throws → that card's buttons break; no script execution — string is inside a selector, never evaluated). Worker 9 is a trusted upstream, so this is a robustness issue, not exploitable XSS. Fix: select inputs by iterating siblings of the button instead of building a selector from data.

## Scope 5 — `handoff/worker9-auth-reference.mjs` (proposal, not integrated)

- Constant-time compare: length check first (documented; length of an operator-managed fixed-length token is not secret), then `crypto.subtle.timingSafeEqual` with `node:crypto` fallback (`worker9-auth-reference.mjs:17-27`). Correct; different-length inputs return `false` without throwing (test-covered).
- 401 (missing/malformed header) vs 403 (wrong token) split is correct and intentional; the resulting "token is set but wrong" signal is an acceptable oracle.
- `wrapFetch` mounts auth before routing for all `/api/*` paths with no response-shape changes (`worker9-auth-reference.mjs:70-89`). Correct.

**Finding 6 (MEDIUM):** Fail-open when `SUPERVISOR_TOKEN` is unset (`worker9-auth-reference.mjs:42-44` → `{ ok: true, warning: "TOKEN_UNSET" }`). It is clearly labeled "acceptable ONLY pre-production" and preserves current behavior, and Worker 13's side already fails closed, so this does not block acceptance — but if Worker 9 adopts the proposal, a loud static misconfiguration becomes a silent open door in any environment where the var is forgotten. Recommend a `REQUIRE_TOKEN=true` opt-in or environment-based fail-closed default before production rollout. (Also note: this risk exists today at Worker 9 regardless of this module — documented in the handoff.)

## Scope 6 — Denial surfaces

- 5s `AbortController` timeout on all adapter calls; abort → `TIMEOUT`, other fetch failures → `UNAVAILABLE`; both render the UI disconnected rather than hanging (`adapter.mjs:37`, `adapter.mjs:56-67`). Fixture `hang` modes test this.
- Audit insert is fully parameterized (`.bind(...)`, `index.mjs:104-111`) — no SQL injection via worker-controlled `workerId`/`action`/payload.
- JSON parse failures: request body `.catch(() => ({}))` → whitelist rejects; upstream malformed JSON → `INVALID_PAYLOAD` (`adapter.mjs:78-83`); shape validation (`assertPacketShape`, `adapter.mjs:96-105`) prevents garbage packet fabrication.

## Scope 7 — SSRF

`ORCHESTRATOR_BASE_URL` is env/operator-controlled only. All path components appended to it are either static literals or `encodeURIComponent`-encoded `workerId`/`phase` (`adapter.mjs:120`, `adapter.mjs:141`). `new URL(path, baseUrl)` with leading-`/` paths cannot escape the configured origin. No user-controlled URL components beyond those two encoded segments. Clean.

---

## Summary of findings

| # | Severity | Item | Location |
|---|----------|------|----------|
| 1 | LOW | No `nbf`/`iat` validation on Access JWT | src/index.mjs:54-56 |
| 2 | LOW | Auth error `detail` echoes parser messages (attacker input only) | src/index.mjs:252 |
| 3 | LOW | REASSIGN_MODEL `model` unbounded length | src/index.mjs:126-131 |
| 4 | LOW | ADJUST_BUDGET no upper bound | src/index.mjs:133-136 |
| 5 | LOW | `dataset.worker` interpolated into CSS selector (DoS-only, no script exec) | src/ui.mjs:112 |
| 6 | MEDIUM | Auth proposal fails open when `SUPERVISOR_TOKEN` unset (documented pre-production only; needs fail-closed path before prod) | handoff/worker9-auth-reference.mjs:42-44 |

Verdict: **ACCEPTED**. No bypass of operator auth, command authorization, or secret handling found. Finding 6 should be tracked as a pre-production gate for the Worker 9 handoff.
