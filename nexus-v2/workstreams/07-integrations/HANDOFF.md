# Worker 7 Phase One Handoff

## Worker 1 — Control Tower / Foundation
Needs: approve tenancy keys, entity ownership, IntegrationEvent envelope/naming, queue/workflow boundary, normalized-entity vocabulary, and ACR-07-001..004. Foundation should provide authorization primitive, database policy pattern, event transport, secret-store choice and environment model.

## Worker 5 — Sales & Assessment
Needs: Connector Registry discovery API, customer connection-request workflow, least-privilege scope templates, status/health surfaces, and configurable mappings for CRM/calendar/e-sign related assessment flows.

## Worker 6 — Managed Service
Needs: ConnectionHealth contract, error taxonomy, freshness SLOs, DLQ/retry state, provider status signals, and client-safe connection health summaries.

## Worker 8 — AI Gateway & Economics
Needs: integration.cost_recorded event contract, actual-vs-estimated flag, vendor/meter/quantity/project allocation, invoice reconciliation hooks. AI workers get opaque connection references/capabilities, never raw customer secrets.

## Worker 9 — Support
Needs: connection diagnostics view, redacted IntegrationError details, reauthorization flow, replay controls, correlation IDs, and customer-safe status messages.

## Worker 10 — Managed Operations / Dev Orchestration
Needs: operational telemetry, alert thresholds, schema drift/auth expiry/provider outage signals, runbook hooks, version/SBOM/dependency controls.

## Worker 13 — Command & Control
Needs: per-connection health, last/next sync, lag, moved/failed record counts, rate-limit state, cost, action_required, provider incidents, schema-change alert, DLQ/replay state.

## Open dependencies
- Control Tower naming/entity/event approval.
- Final managed queue/workflow runtime and secret store selection.
- Nango/Merge/Paragon commercial/security review and quotes.
- First-client POS/ERP/shipping priorities.
- Real provider sandbox credentials for integration testing.

## Golden Rule status
Architecture/contracts are designed and committed. They are not production connected or production verified. Phase One Worker 7 can be Complete only as an architecture-and-contract workstream if required artifacts and validations are present; actual P0 connector production verification belongs to later implementation phases.
