# Career HUD Access gate

`worker/hud-access.mjs` blocks `/hud`, `/hud/*`, `/api/hud`, and `/api/hud/*` unless the incoming request is for the configured canonical host and carries a cryptographically verified Cloudflare Access application JWT for the configured owner.

It deliberately has no fallback to a cookie, raw email header, bearer token, or public preview mode. Missing configuration is a `503` with `Cache-Control: no-store`; invalid or absent Access JWTs are `403`; alternate hosts are `404`. Percent-encoded paths that would decode to a HUD or HUD API route are rejected before static-asset dispatch. HUD asset responses that pass validation are also marked `Cache-Control: no-store`.

## Required deployment configuration

Do not set any value until it is copied from the saved Cloudflare Access application and verified in a protected browser test.

| Binding | Required value |
| --- | --- |
| `HUD_CANONICAL_HOST` | Exact public hostname for the HUD only, without scheme or path. |
| `HUD_ACCESS_TEAM_DOMAIN` | Exact Access issuer/team domain, including `https://`, for example `https://&lt;team&gt;.cloudflareaccess.com`. |
| `HUD_ACCESS_AUD` | The Access application's **Application Audience (AUD) Tag**. |
| `HUD_OWNER_EMAIL` | The one owner email allowed by policy. |
| `HUD_BACKEND_ORIGIN` | Optional exact origin `https://agency-nexus-command.fly.dev`. When unset or malformed, an authenticated HUD runtime request returns a no-store `409` and makes no backend request. |

The Worker fetches the signing JWKS only from the configured Access team domain, verifies `RS256`, issuer, audience, `nbf`, `iat`, and `exp`, requires an `app` token, and compares the verified JWT `email` claim with `HUD_OWNER_EMAIL`.

After that gate succeeds, the Worker may proxy only these fixed backend paths:

- `GET /api/hud/opportunities`, with the verified Access assertion and `Accept: application/json`;
- `GET /api/hud/references`, with the verified Access assertion and `Accept: application/json`;
- `PATCH /api/hud/opportunities/<stable opp_ id>`, with the same assertion and a bounded (16 KiB), same-origin `application/json` body; and
- `GET /api/hud/photo`, with the same assertion and `Accept: image/jpeg`.

It never forwards browser cookies, caller-selected paths, arbitrary URLs, or CORS headers. The opportunities, references, and photo routes reject query strings. The references proxy buffers the complete JSON response and cancels it above 2 MiB (whether or not its declared length is accurate), returning a no-store unavailable response rather than partial private data. The PATCH route rejects non-JSON bodies, cross-origin or origin-less browser writes, and oversized bodies before contacting the backend. Any other `/api/hud/*` request remains a no-store `404`.

The current Google identity-provider `invalid_client` error must be resolved in Cloudflare using the real matching Google OAuth client ID and secret before these values are enabled. This repository contains neither OAuth credentials nor Access metadata.

## Publication gate

Before a production deploy, independently confirm all of the following:

1. The Access application covers both `/hud` and `/hud/*`; the latter alone does not protect the parent path.
2. Google login succeeds for the owner and fails for every other account. Do not deploy while the IdP reports `invalid_client`.
3. The configured issuer, AUD tag, canonical host, and owner email match the values above.
4. Anonymous requests to `/hud`, `/hud/`, `/hud/hud.js`, `/hud/assets/storefront.webp`, `/api/hud`, `/api/hud/`, `www`, and any worker-development host are denied; authenticated owner requests load the HUD.
5. The root `ndgcv` Worker, rather than the Apps-only Worker, receives the canonical `/hud/*` route. Its out-of-band binding names must include all four required configuration values; do not treat `--keep-vars` as proof that they exist.
6. Run the anonymous smoke test only after the exact origins are known, for example: `HUD_RELEASE_ORIGIN=https://nicolasgoureau.com HUD_NONCANONICAL_ORIGINS=https://www.nicolasgoureau.com,https://<worker>.workers.dev npm run verify:hud-release`. It must never find a successful anonymous HUD response. Then complete the owner and other-account browser checks separately.

`wrangler.preview.jsonc` intentionally invokes the same Worker entry and `run_worker_first` as production. Because preview bindings are absent by default, preview `/hud/*` is a fail-closed `503`, not a public static preview.

No personal records are present in this repository or sample HUD. A future private API must remain inside `/api/hud/*` and pass this gate before any data binding is added.
