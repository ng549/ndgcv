# Integration Acceptance Tests

Phase One artifact validation is contract-level; no provider production connection is claimed.

## Contract/schema
- ConnectorDefinition fixture validates required provider/auth/capability/resource/health fields.
- Unknown optional provider metadata is forward-compatible.
- Connector version change is detectable.
- Missing auth method/resource operations fails validation.

## Tenant isolation
- Same organization/client/project/environment can resolve its connection.
- Different organization cannot read/use connection even with valid connection ID.
- Different client/project cannot dereference CredentialReference.
- Dev credential cannot be used from prod environment.
- Queue/webhook replay preserves immutable tenant context.
- Admin cross-project sharing works only through explicit grant, never implicit lookup.

## Secrets/auth
- No API response returns raw stored credential.
- Logs/traces redact tokens, API keys, signing secrets and database passwords.
- OAuth refresh updates vault secret without plaintext application persistence.
- Revoked/expired token transitions health correctly.
- Rotation produces audit event and old credential becomes unusable after grace policy.
- Scope escalation requires new authorization/approval.

## Webhooks
- Invalid signature rejected before processing.
- Valid duplicate event acknowledged but processed once.
- Replay outside allowed timestamp window rejected where provider supports timestamp signing.
- Handler acknowledges after durable receipt, not after full downstream work.
- Transient consumer failure retries; exhausted retry enters DLQ.
- Authorized replay does not create duplicate side effects.
- Oversized/malformed payload rejected safely.

## Sync
- Incremental cursor advances only after durable page/checkpoint.
- Crash between pages resumes without loss/duplication.
- Rate limit pauses/reschedules.
- Full sync is resumable.
- Backfill range is bounded/audited.
- Reconciliation detects deliberately omitted source record.
- Provider deletion semantics do not cause accidental deletion-by-absence.

## Bidirectional write
- Read-only connection blocks all writes.
- Write permission plus provider scope required.
- Stale ETag/version produces conflict, not blind overwrite.
- High-risk write can require approval reference.
- Mutation audit records actor/source/result.
- Retry does not duplicate non-idempotent mutation.

## Mapping/transformation
- Rename/type/format/lookup/concat/split/conditional/calculated/normalize/validate/enrich fixtures execute deterministically.
- Invalid mapping version is rejected.
- Schema drift routes to SCHEMA_CHANGE.
- Mapping failure preserves source provenance and does not advance cursor past unhandled record unless explicit quarantine policy applies.

## Health/observability
- Synthetic signals exercise HEALTHY, DEGRADED, AUTH_EXPIRED, RATE_LIMITED, SYNC_DELAYED, FAILED, DISCONNECTED.
- Metrics include tenant/provider/connection dimensions without secrets.
- Alert thresholds generate action_required events.
- Cost event allocates to correct project and supports invoice reconciliation.

## MCP
- Invocation cannot cross tenant context.
- Raw credential never appears in model/tool args.
- Unapproved tool/write is denied.
- Tool-schema/version drift triggers degraded/hold state.
- Untrusted MCP output is not automatically executed as instructions.

## Production acceptance (future)
At least one real sandbox/test account per P0 connector; auth + read + webhook or polling + recovery + tenant isolation + observability tests; provider rate-limit/error simulation; security review; commercial-rights check; production pilot and monitored verification. Until these pass, connectors are not production verified.
