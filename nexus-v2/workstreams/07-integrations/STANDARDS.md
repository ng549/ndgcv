# Integration Standards

## Credential / secrets model
Supported auth: OAuth 2.0, API key, service account, PAT, webhook signing secret, database credentials, MCP auth, delegated authorization. Store secrets in an approved managed vault or connection broker. Application tables store opaque references only. Encrypt in transit TLS 1.2+ and at rest with provider-managed KMS or equivalent. Separate dev/stage/prod namespaces. Refresh OAuth tokens server-side; record expiration/revocation without logging tokens. Rotation events are audited. Request minimum scopes and expose scope changes to customer authorization.

## Tenant isolation
Every request starts with authenticated principal + organization/client/project/environment context. Resolve connections using all applicable tenancy keys; never by connection_id alone. Enforce server-side authorization and database row policy when available. Cache keys, queue messages, logs and secret namespaces include tenant context. AI workers never receive raw credentials.

Required isolation tests: same-tenant allowed; cross-org denied; cross-client denied; cross-project denied unless explicit shared-resource grant; environment separation; guessed ID denied; queue replay cannot change tenant; secret ref cannot be dereferenced from another tenant.

## Webhook standard
Ingress order: size/content-type guard → provider identification → raw-body signature verification → timestamp/replay-window check where supported → tenant resolution → event-id extraction → dedupe → minimal durable receipt → enqueue → acknowledge → async normalize/process.

Idempotency key = provider + provider_account + provider_event_id when available; otherwise deterministic hash of stable delivery attributes. Keep receipt ledger. Retries use exponential backoff + jitter; poison events go to DLQ. Replay requires operator authorization and preserves original event id. Ordering is only guaranteed per resource when provider supplies an ordering/version primitive. Raw payload retention defaults short-lived and encrypted; redact/tokenize sensitive data and follow client/regulatory policy.

## Synchronization standard
Modes: incremental, full, backfill, reconciliation. Cursor advances only after durable persistence of all records in the checkpoint. Pagination state is resumable. Rate-limit headers feed scheduler. Full sync does not delete by absence unless provider semantics and deletion policy explicitly permit it. Reconciliation periodically verifies cursor-based sync against source counts/updated ranges.

## Mapping / transformation standard
Mappings are versioned configuration, never per-customer code by default. Rule shape: source_path → ordered transforms → destination_path → validation → on_error policy.
Transforms: rename, type conversion, format, lookup, concatenate, split, conditional, calculated, normalize, validate, enrich.
Mapping publication requires sample validation and schema-version compatibility. Historical jobs retain mapping/transformation version.

## Error taxonomy
AUTHENTICATION, AUTHORIZATION, RATE_LIMIT, NETWORK, PROVIDER_OUTAGE, INVALID_PAYLOAD, SCHEMA_CHANGE, MAPPING_FAILURE, TIMEOUT, WRITE_CONFLICT, QUOTA, UNKNOWN.
Retryable by default: RATE_LIMIT, NETWORK, PROVIDER_OUTAGE, TIMEOUT. Conditional: QUOTA, WRITE_CONFLICT. Non-retryable until configuration/action: AUTHENTICATION, AUTHORIZATION, INVALID_PAYLOAD, SCHEMA_CHANGE, MAPPING_FAILURE. UNKNOWN starts bounded-retry then escalates.

## Health model
HEALTHY: auth valid and freshness SLO met, last required operation succeeds.
DEGRADED: intermittent retryable failures or approaching lag threshold.
AUTH_EXPIRED: credential expired/revoked or refresh failed.
RATE_LIMITED: provider throttle actively blocks SLO.
SYNC_DELAYED: freshness SLO breached while connection otherwise reachable.
FAILED: sustained non-retryable failure or retry budget exhausted.
DISCONNECTED: customer/admin intentionally disconnected or provider account removed.
Health is computed from auth state, last success, lag, retry/error rate, provider status and queue age.

## Integration event envelope
Proposed names: connection.created, connection.authenticated, connection.failed, connection.reauthorized, connection.disconnected, sync.started, sync.completed, sync.failed, record.created, record.updated, record.deleted, webhook.received, integration.rate_limited, integration.schema_changed, integration.cost_recorded.
Envelope required: id, event_name, event_version, occurred_at, received_at, organization_id, client_id, project_id, environment_id, connection_id, provider, correlation_id, causation_id, source_event_id?, payload_ref?, provenance. Global naming requires Control Tower approval.

## Integration cost event
integration.cost_recorded carries vendor, service, connection_id, project/client allocation, meter_type, quantity, unit, currency, wholesale_amount, estimated/actual flag, billing_period, source_invoice_ref when reconciled, event timestamp and correlation id. Worker 8 owns economics reconciliation semantics.
