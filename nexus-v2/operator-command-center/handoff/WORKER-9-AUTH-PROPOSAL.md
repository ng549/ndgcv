# PROPOSED Worker 9 Change — Supervisor API Authentication

> **PROPOSED — NOT INTEGRATED — REQUIRES WORKER 9 OWNER ACCEPTANCE.**
> Target module: `nexus-v2/worker-supervisor/` (Worker 9-owned). Factory Test #6 does **not**
> modify that module per ownership rules. This document plus
> `handoff/worker9-auth-reference.mjs` are a handoff artifact only.

## 1. Problem (verified at HEAD `72389be`, branch `nexus-v2-p1-09-build-orchestration`)

`worker-supervisor/src/index.mjs` `fetch` handler contains **zero authentication or
authorization checks**. Any client that can reach the service can:

- `GET /api/workers` — read all Work Packets (scopes, branches, budgets, models, blockers);
- `POST /api/workers/:id/commands` — issue all 9 commands (`RUN CONTINUE PAUSE RESUME STOP
  RETRY REASSIGN_MODEL ADJUST_BUDGET SEND_TO_REVIEW`);
- `POST /api/run-all-ready`, `POST /api/run-phase/:phase` — trigger bulk launches
  (real spend against real budget caps).

Meanwhile Worker 13 (operator-command-center) already sends
`Authorization: Bearer ${ORCHESTRATOR_TOKEN}` on every orchestrator call — a credential that is
**never validated** by Worker 9. The trust boundary is unenforced on the privileged side.
This was the Test #1 finding; it is still true at current HEADs.

## 2. Proposed minimal change

Add one **optional-but-recommended** secret: `SUPERVISOR_TOKEN`.

Semantics (applies to **all `/api/*` routes**, before routing):

| Condition | Result |
|---|---|
| `SUPERVISOR_TOKEN` **set**, `Authorization: Bearer <token>` missing/malformed | `401 {"error":"AUTH_REQUIRED"}` |
| `SUPERVISOR_TOKEN` **set**, token mismatch | `403 {"error":"AUTH_FORBIDDEN"}` |
| `SUPERVISOR_TOKEN` **set**, token matches | proceed unchanged |
| `SUPERVISOR_TOKEN` **unset** | proceed unchanged (current behavior) + loud startup/per-request console warning; acceptable **only pre-production** |

Additional requirements:

- **Constant-time comparison** of the presented token (`crypto.subtle.timingSafeEqual` on
  UTF-8 encoded bytes; length checked first so mismatched lengths short-circuit without throwing).
- **Audit event** on rejection: `audit(env, null, null, "AUTH_REJECTED", { code })` via the
  existing `audit()` helper, so rejections land in `supervisor_events` like every other event.
- **No route changes, no response-shape changes** for authorized traffic. Non-`/api/*` paths
  (none today, future health checks) are unaffected.
- Token value must never be logged; rejections log only the code.

## 3. Diff-style sketch against `worker-supervisor/src/index.mjs`

```diff
 export default {
   async fetch(request, env) {
     try {
       const url = new URL(request.url);
+      if (url.pathname.startsWith("/api/")) {
+        const authz = await authorizeWorker9Request(request, env);
+        if (!authz.ok) {
+          await audit(env, null, null, "AUTH_REJECTED", { code: authz.code });
+          return json({ error: authz.code }, authz.status);
+        }
+        if (authz.warning === "TOKEN_UNSET") {
+          console.warn("[worker-supervisor] SUPERVISOR_TOKEN unset — /api/* is unauthenticated (pre-production only)");
+        }
+      }
       if (request.method === "GET" && url.pathname === "/api/workers") {
         ...unchanged...
```

`authorizeWorker9Request` is implemented and tested in
`handoff/worker9-auth-reference.mjs` (reference implementation; Worker 9 may inline it).

## 4. Test plan (fixture-verified; see `tests/worker9-auth-proposal.test.mjs`)

1. Token set + missing header → 401 `AUTH_REQUIRED`.
2. Token set + wrong token → 403 `AUTH_FORBIDDEN` (distinct from 401 so callers can tell
   "no credential" from "bad credential").
3. Token set + correct token → ok.
4. Token unset → ok with `TOKEN_UNSET` warning (behavior preserved pre-production).
5. Different-length tokens → rejected, no throw (no length oracle via exception).
6. Constant-time comparison path used (structure check; `timingSafeEqual` on encoded bytes).
7. Worker 13 integration: with auth enforced and correct token, existing
   `Authorization: Bearer ${ORCHESTRATOR_TOKEN}` calls succeed unchanged; with a wrong token,
   Worker 13's adapter surfaces the already-implemented `AUTH_REJECTED` error code
   (verified fixture-side via `fixtures/worker9-server.mjs` `authEnforced` mode).

## 5. Rollout note

1. Generate and store `SUPERVISOR_TOKEN` (Worker 9 secret store) and set Worker 13's
   `ORCHESTRATOR_TOKEN` to the same value.
2. Deploy Worker 9 with the token **set** — Worker 13 traffic is unaffected because it already
   sends a Bearer token.
3. **Must be set before any non-localhost exposure.** The unset pass-through exists solely to
   keep pre-production local development unbroken; it emits a loud warning and should be
   treated as a launch-blocking finding otherwise.
4. No canonical re-pin, no contract version bump required: wire shapes are unchanged.

## 6. Related recommendation: actor attribution (from architecture review A1)

Control Tower §2 requires actor identity on state-changing commands. As of this
integration branch, Worker 13 includes `requested_by` (operator email) and `request_id`
in the command body; Worker 9 (`72389be`) currently ignores both and its
`supervisor_events` audit records only `command` + `payload`. Recommended Worker 9
follow-up: accept and persist `requested_by`/`request_id` in the command audit event.
No breakage either way — unknown fields are ignored by the current handler.

— Worker C (tests/adversarial), Factory Test #6; section 6 added by orchestrator after architecture review.
