# Agency Execution Gateway

Status: **Implemented / Unverified**
Step: Agency Build Stack, Step 2 (integration phase)
Branch: `agency/execution-gateway-step2`

## Purpose

Supplies the deployed, policy-gated `/v1/worker-executions` endpoint that the
Worker 9 supervisor (`nexus-v2/worker-supervisor`) needs to actually launch
API/agent workers (blocker `W8-LIVE-GATEWAY`). Worker 8 remains the owner of the
full AI Gateway design (entitlement, wallet reservations, provider manifests);
this service is the minimal execution seam the integration phase is allowed to
supply, behind an `ExecutionProvider` abstraction so Factory stays replaceable.

## Contract

`POST /v1/worker-executions` accepts exactly the payload Worker 9's
`launchGateway()` sends (request/idempotency IDs, worker ID, capability,
preferred model, remaining budget, branch, allowed files, context refs,
acceptance criteria, checkpoint and canonical SHAs) and returns the result
shape Worker 9's `nextStateAfterExecution()` consumes:

- `cancelled` / `blocker` / `failed` / `acceptance.all_satisfied` +
  `verification.passed` / none of those (= work remains, supervisor requeues)
- plus `checkpoint_sha`, `provider` (name + opaque ref), and `usage`
  (elapsed time; `cost_state` is never more than `ESTIMATED` — Factory credit
  telemetry is not invoiced dollars).

`POST /v1/worker-executions/:requestId/cancel` interrupts the underlying
provider execution. `GET /health` is unauthenticated and trivial.

## Execution model

One POST = one bounded slice (default 240s, `SLICE_SECONDS`). The gateway
launches a Factory session on a managed computer (`FACTORY_COMPUTER_ID`) with a
self-contained worker prompt: repo/branch setup, hard file-scope and budget
boundaries, a broker-based checkpoint-push recipe (the session environment
carries the broker Cloudflare Access service token; raw GitHub credentials are
never present), and a required `OUTCOME_JSON` final-message protocol.

Idempotency: the supervisor's idempotency key maps to the provider session in
KV. A replayed terminal result returns without relaunching; a slice that times
out returns `work_remaining` and the next launch with the same key resumes the
same session (send-continue-if-idle), which is the canonical
"continue from last verified checkpoint" behavior.

## Security posture

- Bearer shared secret (`GATEWAY_BEARER_TOKEN`, Worker secret) compared via
  SHA-256 hashes; all responses `no-store`.
- The gateway holds only a Factory API key. GitHub credentials live exclusively
  behind the Step 1 broker; launched workers mint their own short-lived
  scoped tokens.
- Known P0 limitations: no Cloudflare Access in front yet (Worker 9's client
  sends Bearer only), no rate limiting, no live cost settlement, preferred
  model is recorded but routing stays with Worker 8.

## Config

Vars in `wrangler.jsonc` (identifiers only). Secrets: `FACTORY_API_KEY`,
`GATEWAY_BEARER_TOKEN` (`wrangler secret put`). KV namespace `EXECUTIONS`
must be created and its id written into `wrangler.jsonc` before deploy.

## Verify

`npm install && npm run check` (types, typecheck, vitest).
