# Nexus V2 — Integration Architecture

Status: Designed / Phase One contract
Authority: nexus-v2/NEXUS-V2-CANONICAL.json
Branch: nexus-v2-p1-07-integrations

## Objective
Standardize client connectivity around **Connect → Normalize → Monitor → Reuse**. Do not replace working customer systems and do not build commodity integration infrastructure from scratch.

## Recommended runtime
1. **Connection broker / connector runtime:** Nango Cloud first for multi-tenant OAuth, credential lifecycle, sync/actions/webhooks where supported.
2. **Direct official APIs/SDKs:** for strategic/high-volume or capability gaps (notably Shopify GraphQL Admin API, Stripe, Google/Microsoft APIs, Amazon SP-API, vendor-specific ERP/POS).
3. **Unified APIs:** category accelerators where their normalized model matches the use case (Merge for CRM/accounting/file-storage/chat categories).
4. **Bulk ELT:** Airbyte or managed equivalent only for warehouse/bulk ingestion, not primary transactional sync.
5. **Durable orchestration:** Temporal Cloud or approved global workflow runtime; integration layer emits/consumes events and does not become the business workflow engine.
6. **Queue/event transport:** managed queue/event bus selected by Foundation/Control Tower; integration contracts are transport-neutral.
7. **Secrets:** managed secret vault / Nango-managed connection secrets; application DB stores only CredentialReference metadata, never plaintext secrets.

## Logical flow
Client Module → Nexus Integration API → Connector Registry → Connection Broker/Adapter → Provider

Provider → Webhook Ingress → Signature Verification → Tenant Resolution → Deduplication → Normalization → Event Queue → Consumer Module

Scheduler → SyncJob → Connector → Cursor/Checkpoint → Provider changes → Normalize → Persist/Event → Advance cursor

## Shared vs dedicated
The code contract is identical. Deployment profile selects shared or dedicated connector runtime, queue, secret namespace and storage. Every object is scoped by organization_id, client_id, project_id and environment_id. Premium dedicated deployments may use dedicated vendor projects/accounts without forking connector code.

## Client customization boundary
Prefer configuration for scopes, mappings, transforms, schedules, entity enablement, write permissions, approval rules, feature flags and destinations. Custom code begins only when provider capability cannot be represented safely through the Connector Contract or when a client-specific algorithm is genuinely proprietary/non-reusable.

## Data normalization
Avoid a giant universal schema. Use a small versioned Nexus business vocabulary (Customer, Contact, Company, Product, SKU, InventoryItem, Location, Order, Transaction, Invoice, Payment, Vendor, PurchaseOrder, Lead, Opportunity, Task, Document) plus provider-native extension payloads. Canonical entity ownership remains subject to Control Tower approval.

Every normalized record carries Provenance:
- provider, provider_account_id, source_entity_type, source_entity_id
- source_updated_at, ingested_at, last_verified_at
- connector_definition_id/version, transformation_version
- connection_id, sync_job_id
- organization_id, client_id, project_id, environment_id

## Bidirectional safety
Connections default read-only. Writes require capability declaration + explicit connection permission + least-privilege provider scopes. Financial/destructive writes may require human approval. Use provider version/ETag where available; otherwise compare last-known source version. Conflict policies: source-wins, destination-wins, manual-review, reject-on-conflict. Every mutation records actor, request, source version, result and rollback reference when provider supports reversal.

## MCP role
MCP is an agent/tool interface, not the canonical data synchronization protocol. Use MCP for interactive/agentic operations when the server is trusted, tenant-scoped, observable and capability-versioned. Use conventional APIs/webhooks/sync for durable production data movement. Trust order: official vendor remote MCP → official vendor self-hosted MCP → reviewed maintained community MCP → reference-only. Archived/unmaintained MCP is prohibited for production credentials.

## Architecture decisions
- Nango-first is the preferred Phase One connection broker, subject to commercial/legal/security review.
- Merge is an optional normalized category accelerator; it is not the universal provider abstraction.
- Shopify new work uses GraphQL Admin API; REST Admin API is legacy.
- Webhooks are preferred for low-latency changes; polling is the fallback.
- Raw provider payloads are retained only under explicit retention/redaction policy.
- Integration runtime and durable business-workflow runtime remain separate.

## Architecture Change Requests for Control Tower
ACR-07-001: approve the IntegrationEvent envelope and event naming namespace.
ACR-07-002: approve canonical tenancy keys (organization/client/project/environment) and ownership.
ACR-07-003: approve shared normalized entity vocabulary and extension policy.
ACR-07-004: approve selected managed secret store and queue/workflow dependencies.
