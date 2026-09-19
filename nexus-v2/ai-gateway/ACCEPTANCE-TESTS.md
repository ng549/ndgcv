# AI Gateway Acceptance Test Specification

Status: specified, not executed against a deployed gateway.

| ID | Setup/action | Expected evidence |
|---|---|---|
| AG-IDENT-001 | Valid signed request for org A/project A | Every policy, route, ledger and trace record contains the resolved org/project; upstream sees only opaque subject. |
| AG-TENANT-001 | Reuse org A request with org B project/user | Denied before entitlement/provider call; audit event emitted; no B data returned. |
| AG-RIGHTS-001 | Revenue request with `UNVERIFIED`, expired or mismatched intended-use record | Denied before credential resolution/provider call. |
| AG-WALLET-001 | Concurrent requests exceed remaining hard cap | Atomic reservations permit only covered amount; losers receive stable cap response. |
| AG-REQUEST-001 | Estimate exceeds per-request cap | Denied or waits for explicit approval; no upstream call. |
| AG-OUTAGE-001 | Primary provider returns outage | Router chooses only an eligible same-policy fallback; attempt events and final route recorded. |
| AG-MODEL-001 | Exact model unhealthy but equivalent route exists | Same-model/different-provider first; material substitute requires prior policy or approval. |
| AG-BYOK-001 | Customer BYOK secret unavailable | Request fails with BYOK error; logs prove no Nicolas/Nexus credential resolution. |
| AG-BYOK-002 | Cloudflare unified-billing fallback is offered on BYOK path | Configuration/policy rejects fallback; provider credential is required. |
| AG-USAGE-001 | Provider returns token/cache/search/tool counts | Raw provider observation and normalized units retained separately and reconcile. |
| AG-COST-001 | Price book includes provider and platform fees | Integer-micro wholesale total matches independent calculation and source version. |
| AG-MARGIN-001 | Retail price is 1,000,000 micros; wholesale total 300,000 | Gross profit 700,000 and margin 7,000 basis points. |
| AG-IDEMP-001 | Same idempotency key delivered concurrently and replayed | One logical request/reservation/retail settlement; duplicates return original result/state. |
| AG-RETRY-001 | First attempt bills wholesale and fails; second succeeds | Both attempt costs recorded; retail charge follows declared retry policy exactly once. |
| AG-MEDIA-001 | Image, video, audio and character-priced fixtures | Unit conversion and rounding match provider invoice units and price-book version. |
| AG-RATE-001 | Tenant/provider/model rate limit reached | Queue or eligible fallback per policy; no unbounded retry loop. |
| AG-TOOL-001 | Model requests undeclared tool | Denied; model text cannot grant permission. |
| AG-MCP-001 | Valid token intended for MCP server A is sent to B | B rejects audience; token passthrough is never performed. |
| AG-AGENT-001 | Agent exceeds iteration/time/tool/spend limit | Job terminates, cancellation attempted, reservation settled/released and alert emitted. |
| AG-AUDIT-001 | Operator changes provider/limit/BYOK policy | Actor, reason, approvals, previous/new version and result are immutable and queryable. |
| AG-PRIVACY-001 | Restricted data requests route lacking retention/region qualification | Route filtered out before credentials/provider call. |
| AG-FORGE-001 | Client submits fabricated usage/cost fields | Ignored; only server-signed/provider-reconciled events affect ledger. |

## Exit criteria

- All tests pass in a production-like multi-tenant environment.
- Load and chaos results meet Control Tower SLOs.
- Provider invoices reconcile within the Worker 10-approved tolerance.
- Security review covers secret rotation, trace redaction, retention/deletion, MCP and prompt/tool injection.
- Required user-visible fallback, credit and approval behavior is verified through the client surface.

Until then the gateway cannot be called production-ready or Complete.
