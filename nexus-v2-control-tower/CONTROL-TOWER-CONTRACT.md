# Nexus V2 Control Tower Contract

Contract version: `0.1.0-draft`  
Status: **Needs Review** after schema validation  
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

- Every request carries `tenant_id`; operator-only activity additionally carries `operator_id`.
- Every project-scoped request carries `project_id`.
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
| Project | Control Tower registry; lifecycle delegated later | `project_id`, `tenant_id` |
| Module | Control Tower | `module_id` |
| Work Packet | Build Orchestration | `work_packet_id`, `project_id` |
| Connector | Integration Layer | `connector_id`, `tenant_id` |
| AI Route / Manifest | AI Gateway | `route_id` / `manifest_id` |
| Usage Event | Producing module; normalized by economics consumers | `event_id` |
| Lead / Opportunity | Marketing then Sales per explicit handoff | `lead_id` / `opportunity_id` |
| Assessment | Sales & Assessment | `assessment_id` |
| Service Agreement / Entitlement | Managed Ops | `agreement_id` / `entitlement_id` |
| Deployment | Build Orchestration; runtime status from hosting provider | `deployment_id` |
| Audit Event | Evidence plane | `event_id`, `actor_id` |

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
- All events use `schemas/domain-event.schema.json`.
- Event names follow `nexus.<domain>.<entity>.<past_tense_action>.v<major>`.
- Consumers must be idempotent by `event_id`.
- Producers own truth; events are facts, not remote commands.
- Personally identifiable or credential data is excluded unless the receiving contract explicitly requires and protects it.

### 4.3 Schemas

- JSON Schema is the canonical validation language for shared data.
- Schemas use semantic versions.
- Additive optional fields are non-breaking; removed, renamed, or meaning-changed fields are breaking.
- Each schema declares owner, classification, retention expectation, and compatibility policy in its module contract.

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
- Adopt a CloudEvents-compatible envelope shape without requiring a broker choice in Phase One.
- Adopt ADRs for accepted durable decisions and ACRs for proposed cross-module changes.
- Defer runtime, database, queue, auth vendor, and hosting selections until relevant workstreams submit research.
- Do not adopt Backstage as the Nexus runtime in Phase One; reuse its catalog concepts selectively.

## 11. Unresolved decisions

- Final tenant identity and authentication provider
- Operational database and tenant-isolation implementation
- Event transport and durable job runner
- Secrets-management provider
- Observability and cost-ingestion backend
- Shared versus dedicated deployment thresholds by service tier
- Contract testing toolchain and CI enforcement
- Data residency, retention, deletion, and backup policies
- Source/IP transfer options for premium clients
- Exact production boundary between `nicolasgoureau.com` and Nexus services

These decisions belong to named workstreams and must not be guessed by implementers.

