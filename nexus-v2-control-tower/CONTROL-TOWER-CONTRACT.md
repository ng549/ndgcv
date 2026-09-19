# Nexus V2 Control Tower Contract

Contract version: `0.2.0-draft`  
Status: **Needs Review** after independent re-review  
Owner: Workstream 1 — Control Tower & Master Architect

## 1. System shape

Nexus V2 is a modular control plane for a fractional business systems company. Phase One produces contracts and bounded research artifacts. Phase Two may implement only after the Control Tower reconciles ownership, APIs, events, security boundaries, and data authority.

The system is separated into four planes:

1. **Operator plane** — Nicolas-only command, approvals, exceptions, economics, and audit.
2. **Client plane** — tenant-scoped client experiences, configuration, and business modules.
3. **Execution plane** — workers, work packets, integrations, jobs, AI routing, and deployments.
4. **Evidence plane** — immutable or append-oriented events, audit, costs, tests, handoffs, and operational telemetry.

No UI is authoritative for shared state. UIs read/write through module contracts.

## 2. Global invariants

- Every request declares `scope` as `tenant` or `system`. Tenant scope requires a nonempty `tenant_id`; system scope forbids tenant impersonation.
- Every authenticated action carries actor type and actor ID. For operator actions, actor ID is the operator identity.
- Every project-scoped request carries a nonempty `project_id`.
- Cross-tenant reads or writes are denied by default and require an explicit Nicolas-approved system capability, purpose, audit event, and least-privilege policy.
- Cross-module changes use versioned APIs or events; no module reads another module's private tables.
- Credentials are references to a secrets manager, never fields in contracts, logs, prompts, or events.
- Customer BYOK credentials are tenant-isolated and cannot fall back to Nicolas's providers.
- Money uses integer minor units plus ISO 4217 currency.
- Time uses RFC 3339 UTC timestamps; source timezone may be retained separately.
- IDs are opaque strings and globally unique within their entity type.
- State-changing commands require an idempotency key and actor identity.
- Every material state change emits an auditable event.
- Production verification is distinct from test success.

## 3. Shared entity vocabulary

| Entity | Authority | Required identity |
|---|---|---|
| Tenant | Shared Client Platform | `tenant_id` |
| Organization | Shared Client Platform | `organization_id`, `tenant_id` |
| User | Shared Client Platform | `user_id` |
| Membership / Role | Shared Client Platform | `membership_id` |
| Project | Shared Client Platform | `project_id`, `tenant_id` |
| Module | Control Tower | `module_id` |
| Work Packet | Build Orchestration | `work_packet_id`, `project_id` |
| Connector | Integration Layer | `connector_id`, `tenant_id` |
| AI Route / Manifest | AI Gateway | `route_id` / `manifest_id` |
| Usage Event | Producing module owns raw fact; Managed Ops owns price normalization, corrections, deduplication, and billing ledger | `event_id` |
| Lead | Marketing until qualification handoff is accepted | `lead_id` |
| Opportunity | Sales & Assessment after accepting a qualified lead | `opportunity_id`, source `lead_id` |
| Assessment | Sales & Assessment | `assessment_id` |
| Service Agreement / Entitlement | Managed Ops | `agreement_id` / `entitlement_id` |
| Deployment | Build Orchestration; runtime status from hosting provider | `deployment_id` |
| Audit Event | Managed Ops owns durable storage/query/retention; every producing module owns factual emission | `event_id`, `actor_id` |

Ownership means schema and lifecycle authority, not exclusive visibility.

## 4. Contract standards

### 4.1 Synchronous APIs

- Describe HTTP APIs with OpenAPI.
- Use path versioning at the module boundary: `/v1/...`.
- Use JSON Schema-compatible payloads.
- Return a stable error envelope: `code`, `message`, `request_id`, optional `details`.
- Breaking changes require a new major API version and migration window.
- Mutations accept `Idempotency-Key`.
- List operations use cursor pagination.

### 4.2 Asynchronous events

- Describe channel contracts with AsyncAPI when implementation begins.
- All events use the native CloudEvents 1.0 JSON-format contract in `schemas/domain-event.schema.json`.
- Event names follow `nexus.<domain>.<entity>.<past_tense_action>.v<major>`.
- CloudEvents `id` is the idempotency key. The major version appears only in `type`; there is no second version field to drift.
- CloudEvents extension attributes use lowercase alphanumeric names: `scope`, `tenantid`, `projectid`, `actortype`, `actorid`, `dataclassification`, `correlationid`, `causationid`, and `traceparent`.
- Tenant events require `tenantid`. System events omit `tenantid` and require authorization outside the payload. Operator actions use `actortype=operator` and the authenticated operator identifier in `actorid`.
- Consumers must be idempotent by `id`.
- Producers own truth; events are facts, not remote commands.
- Personally identifiable or credential data is excluded unless the receiving contract explicitly requires and protects it.

### 4.3 Schemas

- JSON Schema is the canonical validation language for shared data.
- Schemas use semantic versions.
- Shared top-level schemas are closed. Adding, removing, renaming, or changing a top-level field is breaking unless the schema already exposes an `extensions` object whose policy explicitly permits that key.
- Producers validate strictly. Consumers accept only the pinned major contract and ignore unknown keys solely inside an approved `extensions` object.
- Each schema/interface declares owner, schema reference, classification, retention expectation, and compatibility policy in its module contract.

## 5. Module boundary rules

Each module must deliver a contract conforming to `schemas/module-contract.schema.json` and include:

- owner and reviewer;
- branch and allowed files;
- owned data and prohibited ownership;
- inbound/outbound APIs and events;
- dependencies and non-goals;
- security/data classification;
- research evidence and reuse decision;
- acceptance criteria and test evidence;
- unresolved decisions;
- exact handoff.

Shared architecture discoveries produce an ACR. A builder may propose but may not silently implement a cross-module redesign.

## 6. Branch and file convention

- Integration: `nexus-v2`
- Phase One: `nexus-v2-p1-<NN>-<slug>`
- Phase Two work packet: `nexus-v2-p2-<module>-<packet>`
- V2 permanent artifacts: `nexus-v2/`
- Phase One workstream artifacts: `nexus-v2/workstreams/<NN>-<slug>/` when reconciled
- Shared schemas: `nexus-v2/contracts/schemas/`
- ADRs: `nexus-v2/architecture/adrs/`
- ACRs: `nexus-v2/architecture/acrs/`

Phase One branches never merge directly. The Control Tower reviews, reconciles, and creates an integration commit or PR containing accepted artifacts only.

## 7. Status and gates

Required status sequence:

`Not Started → Researching → Designed → Implementing → Implemented / Unverified → Testing → Needs Review → Production Verified → Complete`

`Blocked` may interrupt any stage and must include blocker, impact, owner, and next action.

### Research gate

No custom implementation begins until candidate reuse records include URL, license, commercial implications, pinned version/commit, maintenance, security, integration effort, lock-in, and remaining custom gap.

### Module gate

A module can enter integration review only when:

- required artifacts exist;
- schemas validate;
- declared acceptance tests pass;
- handoff names exact paths and commits;
- known limitations and unresolved decisions are explicit;
- independent reviewer is assigned.

### Integration gate

The Control Tower checks:

- no conflicting ownership;
- API/event compatibility;
- tenant and identity propagation;
- secrets isolation;
- observability and audit coverage;
- migration/backout path;
- cross-module tests;
- economics event compatibility.

### Completion gate

“Complete” is unavailable until approved scope, tests, integrations, production behavior, limitations, and remaining work satisfy the canonical Golden Rule.

## 8. Definition of Done

For a bounded work packet:

1. Scope and acceptance criteria are approved.
2. Research-before-build record is present.
3. Work stays inside allowed files and module ownership.
4. Code/docs/schemas are committed to the assigned branch.
5. Static validation and required automated tests pass.
6. Security, tenant isolation, failure paths, and observability are tested as applicable.
7. Independent review has no unresolved blocking findings.
8. Integration tests pass against version-pinned contracts.
9. Deployment is verified in the target environment when production behavior is in scope.
10. Handoff discloses tests, evidence, limitations, and remaining work.

## 9. Phase One reconciliation order

1. Control Tower publishes draft shared vocabulary and contract formats.
2. Reuse Scout attaches evaluated candidates to each workstream.
3. Integration and AI Gateway propose their boundary contracts against shared schemas.
4. Control Tower resolves identity, event, secrets, cost, and audit overlap.
5. Business Model, Marketing, Sales, Client Platform, Build Orchestration, Managed Ops, and Design System submit contracts.
6. Old Nexus Auditor submits candidates only; module owners decide any later migration.
7. Operator Gateway submits after the first Control Tower draft and consumes accepted read models/events.
8. Independent cross-model review identifies collisions.
9. Accepted artifacts are normalized into one integration PR; no source workstream branch is merged wholesale.

## 10. Initial architecture decisions

- Adopt contract-first module boundaries.
- Adopt JSON Schema for shared payload validation.
- Adopt OpenAPI for synchronous HTTP contracts.
- Adopt AsyncAPI for asynchronous channel documentation.
- Adopt native CloudEvents 1.0 JSON format without requiring a broker choice in Phase One.
- Adopt ADRs for accepted durable decisions and ACRs for proposed cross-module changes.
- Defer runtime, database, queue, auth vendor, and hosting selections until relevant workstreams submit research.
- Do not adopt Backstage as the Nexus runtime in Phase One; reuse its catalog concepts selectively.

## 11. Unresolved decisions

| Decision | Accountable workstream |
|---|---|
| Final tenant identity and authentication provider | Shared Client Platform |
| Operator authentication/session provider and adapter to shared auth context | Operator Gateway |
| Operational database and tenant-isolation implementation | Shared Client Platform |
| Event transport and durable job runner | Integration Layer |
| Secrets-management provider | Integration Layer |
| Observability and cost-ingestion backend | Managed Ops |
| Shared versus dedicated deployment thresholds by service tier | Business Model + Shared Client Platform |
| Contract testing toolchain and CI enforcement | Build Orchestration |
| Data residency, retention, deletion, and backup policies | Managed Ops + Shared Client Platform |
| Source/IP transfer options for premium clients | Business Model |
| Exact production boundary between `nicolasgoureau.com` and Nexus services | Operator Gateway |

These decisions belong to named workstreams and must not be guessed by implementers.

## 12. Explicit ownership transitions

- **Lead to opportunity:** Marketing emits `nexus.marketing.lead.qualified.v1`. Sales validates and accepts the handoff, creates `opportunity_id` with immutable source `lead_id`, then emits `nexus.sales.opportunity.created.v1`. Marketing retains lead history; Sales owns the opportunity lifecycle.
- **Identity:** Shared Client Platform owns the client auth-context contract and client memberships. Operator Gateway owns Nicolas's operator session and maps it into the shared actor context. Other modules consume the context and may not create independent identities.
- **Usage to billing:** Producing modules emit immutable raw usage facts. AI Gateway owns AI-specific measurement. Managed Ops owns pricing-version application, deduplication, corrections, invoice/billing events, and the financial ledger.
- **Audit:** Producing modules emit audit facts. Managed Ops owns storage, retention, access controls, and query interfaces. Audit facts are append-oriented; corrections reference rather than overwrite earlier facts.
- **Project lifecycle:** Shared Client Platform owns project creation, membership, lifecycle status, and tenant attachment. Control Tower owns only the module/contract registry and integration governance.
