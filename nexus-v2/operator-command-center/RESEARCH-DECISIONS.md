# Worker 13 — Research and implementation decisions

Date: 2026-09-19

## Selected for P0

- Cloudflare Access for the private operator authentication/session boundary.
- Cloudflare Workers for the operator UI and API edge.
- Cloudflare native rate limiting rather than a custom counter.
- D1 for persistent operator command audit records.
- A thin server-to-server adapter to Worker 9 rather than direct browser access to orchestration.
- Polling every 15 seconds for P0 until Worker 9 publishes a real event stream.

## Held for Phase Two

- Durable Objects with Hibernation WebSockets for realtime worker events once a real orchestration event source exists.
- Hono if route or middleware complexity grows enough to justify another runtime dependency.

## Not selected for P0

Generic admin dashboard kits were not selected because the immediate acceptance target is authenticated worker supervision and truthful control gating, not a broad CRUD/admin surface.

## Evidence reviewed

Cloudflare Access documentation states that Access can sit in front of self-hosted applications as an identity-aware authentication layer and that origin token validation is required to prevent bypass.

Cloudflare's Workers rate-limiting binding provides edge-native per-key limiting and is maintained as a platform primitive.

Cloudflare Durable Objects support coordinated state and WebSockets, including a hibernation API designed for long-lived realtime connections without keeping an object active while idle.

## Golden Rule application

The UI does not infer runtime status. If Worker 9 is absent, unreachable, returns an invalid response, or omits a worker, that worker renders as UNKNOWN. Individual and global commands stay disabled unless orchestration explicitly advertises the action as supported.
