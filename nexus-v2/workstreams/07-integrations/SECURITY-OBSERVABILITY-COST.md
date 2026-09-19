# Connectivity Security Threat Model, Observability & Cost

## Threat model and controls
| Threat | Required controls |
|---|---|
| Stolen credentials/OAuth token leakage | managed vault; no plaintext DB/logs/prompts; scoped tokens; rotation/revocation; environment separation |
| Excessive scopes | minimum-scope templates; consent display; periodic scope audit; separate read/write grants |
| Cross-tenant access | mandatory tenant context; server authorization; RLS/policy; tenant-scoped cache/queue/secret keys; negative tests |
| Webhook spoof/replay | raw-body signature verification; timestamp/replay windows where supported; event-id dedupe; TLS; secret rotation |
| API abuse | per-tenant quotas/rate limiting; capability allowlists; anomaly alerts; write approvals |
| Malicious payload/injection | schema/size validation; escaping; no executable transforms; untrusted-content handling for AI/MCP |
| Compromised connector/dependency | trust tiers; pin versions; SBOM/SCA; staged updates; vendor review; kill switch |
| SSRF | outbound allowlist/provider host policy; block link-local/private metadata ranges; controlled redirect policy |
| Injection | parameterized DB operations; schema validation; safe templating; transformation DSL without arbitrary code by default |
| Exfiltration | egress controls; field minimization; DLP/redaction; tenant-bound destinations; audit logs |
| Sensitive logging | structured redaction; payload sampling controls; retention limits; secret detectors |
| Secrets in AI prompts | credential broker executes calls; models receive opaque connection IDs/capabilities only |

## Observability contract
Per connection expose: state/health, last auth, last successful sync, last attempt, next scheduled sync, records read/written/failed, lag, retries/DLQ count, active rate limit/reset, provider status signal, schema-change signal, webhook last delivery, cost estimate/actual, action required.

Required telemetry dimensions: organization/client/project/environment, connector/provider/version, connection_id, resource, operation, sync_job_id, correlation_id, outcome/error_category. Never place token/secret or unrestricted raw payload in telemetry.

Metrics: sync success rate, p50/p95 duration, freshness lag, records/sec, webhook verification failures, dedupe rate, retry rate, DLQ depth, auth failures, provider 429/5xx, schema/mapping errors, bytes transferred, integration cost.

Alerts: auth expired immediately; sustained failed sync; freshness SLO breach; DLQ nonzero above threshold; schema change; unusual write volume; webhook signature failures spike; spend anomaly.

Worker 10 consumes operational health/incident telemetry. Worker 13 consumes operator-level state and action_required. Worker 8 consumes cost events.

## Cost tracking
Track vendor API charge, connection/month fee, compute/runtime, data transfer, webhook/task volume, managed queue/DB contribution, paid connector/iPaaS fee, and contractor maintenance. Each cost record is allocatable to client/project/environment and marked estimated vs invoice-reconciled.

Cost control policy:
- set per-client budget/usage alerts;
- compare aggregator cost versus direct-maintenance cost quarterly;
- preserve connector portability;
- reconcile vendor invoices to integration.cost_recorded;
- include dedicated-infrastructure surcharge in premium economics.

## Licensing/commercial concerns
Nango uses source-available/commercial terms and must receive current legal/commercial review before product resale/embedded assumptions. Airbyte and some open-source iPaaS offerings have source-available/AGPL/commercial boundaries. Merge/Paragon/Pipedream are commercial services. Record current contract rights, transfer/resale terms, SLAs, data processing terms and exit/export path before production approval.
