# Nexus V2 — Nicolas Command & Control

Status: **Implemented / Unverified**
Worker: 13
Branch: `nexus-v2-p1-13-operator-command-center`

## Purpose

Smallest useful private operator surface for Nicolas to supervise Nexus API workers without repeatedly opening consumer AI chats. This slice prioritizes truthful worker state and safe command issuance over dashboard polish.

## What is implemented

- Mobile-first and desktop-responsive private `/operator/` UI.
- Cloudflare Access JWT verification at the Worker origin.
- Explicit Nicolas-only email authorization via `OPERATOR_EMAIL`.
- Cloudflare Worker rate-limit binding before serving operator data or actions.
- D1-backed operator command audit log.
- Same-origin + JSON-only write protection.
- Server-only orchestrator bearer token; it is never returned to browser code.
- Worker state normalization with `UNKNOWN` as the fail-safe.
- RUN / CONTINUE / PAUSE / RESUME / STOP / RETRY.
- RUN ALL READY / RUN PHASE.
- Every action is disabled unless the orchestrator explicitly advertises it.
- 15-second status refresh. No synthetic heartbeat is generated.
- Worker 8 boundary preserved: this surface does not select providers/models directly.

## Worker 9 integration contract

Expected authenticated server-to-server endpoints:

- `GET /api/workers`
- `POST /api/workers/:id/commands`
- `POST /api/run-all-ready`
- `POST /api/run-phase/:phase`

The exact response/request contracts are under `schemas/`.

Worker 9 has now published these routes and its command contract on `nexus-v2-p1-09-build-orchestration`; Worker 13 is aligned to that contract. Until a deployed Worker 9 service endpoint and service credential are attached, the UI still returns seeded workers with truthful `UNKNOWN` runtime state and disabled controls. Branch names are provenance hints, not proof of execution.

## Authentication and sessions

Use **Cloudflare Access** in front of `nicolasgoureau.com/operator/*`. Access owns the browser session through its signed authorization cookie; this Worker independently validates the Access JWT at origin and checks its audience and Nicolas's email. The hidden/subtle site link is discovery only and never treated as security.

Required secrets/vars:

- `ACCESS_TEAM_DOMAIN` — example `your-team.cloudflareaccess.com`
- `ACCESS_AUD` — Access application audience
- `OPERATOR_EMAIL` — Nicolas's exact authorized email
- `ORCHESTRATOR_BASE_URL` — Worker 9 service endpoint when available
- `ORCHESTRATOR_TOKEN` — Worker 9 service token, stored as a Worker secret

Never put provider master keys in this Worker or browser. Worker 13 talks to Worker 9; Worker 9 talks to Worker 8.

## Audit setup

Create D1 database `nexus-v2-operator-audit`, replace the placeholder database ID in `wrangler.jsonc`, then apply:

```sh
wrangler d1 execute nexus-v2-operator-audit --file migrations/0001_audit.sql --remote
```

Command writes fail closed when `AUDIT_DB` is unavailable.

## Rate limiting

The Worker uses Cloudflare's native Rate Limiting binding keyed by authorized operator email. The P0 config is 60 requests/minute. Adjust only after observing real operator traffic.

## Realtime decision

P0 uses a 15-second refresh rather than inventing realtime infrastructure before Worker 9 has a live event stream.

Recommended Phase Two path: Cloudflare Durable Objects + Hibernation WebSockets only if Worker 9 emits durable worker events. This keeps live status evidence-based and avoids a second speculative source of truth.

## Framework/reuse research — 2026-09-19

Research-before-build was applied.

1. **Cloudflare Access** — selected for authentication/session front door because it is an identity-aware proxy, deny-by-default by policy, and supports signed application JWTs that the origin can validate.
2. **Cloudflare Workers** — selected for the private edge/API surface; existing project infrastructure already uses Cloudflare.
3. **Cloudflare Workers Rate Limiting binding** — selected rather than custom counters.
4. **Cloudflare D1** — used for P0 command audit persistence. Control actions fail closed without it.
5. **Durable Objects Hibernation WebSockets** — maintained realtime option for Phase Two, not added before a real Worker 9 stream exists.
6. **Hono** — reviewed as a maintained Workers framework, but not added in P0 because the current route surface is small and adding a runtime dependency does not reduce meaningful code or risk yet.
7. Generic admin-dashboard kits were not selected for P0 because the primary problem is authenticated command/control correctness, not CRUD UI composition.

Official references:
- Cloudflare Access self-hosted application and origin token validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- Cloudflare Access authorization cookie/JWT: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/
- Workers Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Workers bindings/secret isolation: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/

## Security invariants

- A subtle link is not an authentication mechanism.
- Missing Access JWT/config denies access.
- Wrong operator email denies access.
- Missing rate limiter denies access.
- Missing D1 disables commands.
- Missing Worker 9 endpoint means UNKNOWN state + disabled commands.
- Orchestrator timeout/unavailability means UNKNOWN state + disabled commands.
- Unsupported actions return 409 and are audited when the audit store is present.
- Browser never receives `ORCHESTRATOR_TOKEN` or any AI/provider secret.
- No merge endpoint exists in this slice.

## Testing

```sh
npm test
npm run check
```

Tests cover unknown-state behavior, control gating and same-origin write checks. Production verification still requires deploying behind the real Access application, applying D1 migration, configuring rate limiting, attaching Worker 9 and exercising commands against a non-production worker.

## Entry on nicolasgoureau.com

The intended entry is:

`nicolasgoureau.com` → subtle operator link → `/operator/` → Cloudflare Access → Command & Control.

This branch intentionally does **not** modify the public CV/navigation yet because the `/operator/` route is not deployed and Access is not configured. Adding a live link before the protected route exists would create a broken entry and would not satisfy P0. The integration commit should add the subtle link only when the protected route is available.

## Current blockers

1. Worker 9 contract is available and consumed, but its service is not deployed/attached to this operator surface, so live worker state and command execution remain unverified.
2. Cloudflare Access application values are not available on this branch.
3. D1 database ID has not been provisioned/verified.
4. The operator Worker has not been deployed to `nicolasgoureau.com/operator/*`.
5. Worker 1 has not yet published a shared status/identity contract artifact on its branch.

Because of these blockers, the truthful status is **Implemented / Unverified**, not Production Verified or Complete.
