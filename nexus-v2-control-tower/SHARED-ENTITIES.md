# Shared entity hierarchy and authority

Status: draft for owner reconciliation. These are logical contracts, not database tables or a mandate for a new custom subsystem. Reuse platform/vendor primitives behind these identities. No module may directly write another module's data.

| Entity | Owner | Relationships and scope |
|---|---|---|
| Tenant | client-platform | Isolation boundary; contains organizations and projects. System scope is separate, never a wildcard tenant. |
| Organization | client-platform | One tenant reference; commercial/legal organization. |
| Client | client-platform | Client profile belongs to an organization and tenant; no duplicate login identity. Sales prospect conversion requests this owner to create/link the profile. |
| Project | client-platform | Tenant and organization references; assigned client profile; membership and lifecycle stay with platform. |
| User | client-platform | Global authentication subject may belong to multiple tenants only through explicit memberships. |
| Membership / Role | client-platform | User plus tenant/project scope and explicit grants; deny by default. A role label alone is not authorization. |
| Module | control-tower | Global capability/contract definition; a tenant's enabled module configuration belongs to client-platform. |
| Work Packet | build-orchestration | Project/tenant reference, module, branch, allowed files, acceptance evidence, independent reviewer. |
| Provider | ai-gateway for AI route metadata; integrations for connector metadata | Vendor identity reference may be shared; capability configurations and credential references remain separately owned. No shared writable provider table. |
| Cost Event | producer owns raw measurement; managed-ops owns normalized ledger | Immutable event ID, scope, project allocation when applicable, source reference, measurement unit, pricing version, amount/currency once priced. AI gateway owns AI measurement. |
| Revenue Event | managed-ops | Invoice/payment/credit/adjustment fact with tenant/project allocation, source ID and money. Business-model defines pricing policy, not realized financial facts. |
| Lead / Opportunity | marketing / sales-assessment | Acceptance of qualified lead establishes opportunity; retain source lead ID. No silent ownership transfer. |
| Audit Event | producer / managed-ops | Producer emits factual action; managed-ops stores, controls access, and retains it. Corrections append references. |

Tenant → organization → client profile/projects describes containment, not authorization inheritance. User → membership → role grants describe access. Project → enabled modules → work packets describes execution. Usage → cost normalization → revenue allocation describes economics; costs and revenues are separate facts, never assumed equivalent.

Money uses integer minor units plus currency; usage quantities retain original units and precision. Unpriced usage is explicitly unpriced, not zero cost. Corrections reference original IDs. Duplicate delivery must not double-count. Cross-currency totals require an explicit rate source/time and separate converted value. Managed Ops owns normalized financial ledger payloads. Producing modules own raw usage and domain event schemas; Control Tower owns the shared envelope. This vocabulary does not preempt Workstream 8 or 10 payload design.

Owner sign-off remains pending for client identity, provider boundaries, project allocation, usage corrections and billing events. Runtime authorization and data isolation are outside this draft's verification.
