# Nexus V2 — Worker 2 Phase One Reuse Scout

Status: **Needs Review / Researching**  
Date: 2026-09-19  
Branch: `nexus-v2-p1-02-reuse-scout`  
Authority: `nexus-v2/NEXUS-V2-CANONICAL.json`

## Executive conclusion

Nexus V2 should not build commodity identity, durable workflow execution, OAuth token lifecycle management, usage metering, LLM routing, observability, support inboxes, CI/CD, dependency scanning, or standard internal-admin primitives from scratch.

Recommended architecture principle:

**Research → Reuse → Integrate → Extend → Build only what is missing.**

The strongest Phase One reuse path is:
- Managed B2B identity (WorkOS AuthKit or Clerk) for users, organizations, invitations, sessions and enterprise SSO readiness.
- Postgres/Supabase for application data and realtime where it fits; enforce tenant isolation at the database policy layer, not only UI filtering.
- Temporal Cloud for durable long-running business workflows, approvals and retryable orchestration.
- Nango Cloud for multi-tenant OAuth, API credentials, token refresh, webhook/sync runtime and common SMB connectors.
- Airbyte only for bulk/warehouse-style ELT, not as the primary product-integration layer.
- LiteLLM or a comparable provider-neutral gateway behind a Nexus-owned contract, with OpenRouter/other aggregators as providers rather than the application contract.
- Langfuse for LLM traces/evaluation/usage observability; do not make it the billing ledger.
- Stripe Billing for payments/subscriptions, paired with OpenMeter or Lago when Nexus needs higher-resolution credits, entitlements, wallets, limits and usage accounting.
- Sentry + OpenTelemetry + managed uptime/logging for application/service observability.
- GitHub Actions + CodeQL/Dependabot + Renovate/Semgrep-class tooling for development automation.
- A custom thin Nexus command-and-control UI over these systems, rather than rebuilding their engines.

## C. Recommended Nexus V2 Foundation Stack

| Capability | Preferred | Backup / conditional | Classification | Notes |
|---|---|---|---|---|
| Authentication / orgs / invites | WorkOS AuthKit or Clerk | Keycloak for self-host mandate | INTEGRATE | Buy identity plumbing; custom code only for Nexus authorization model and project rules. |
| Primary relational data | Postgres / Supabase | Managed Postgres elsewhere | USE DIRECTLY | Use explicit tenant/org IDs and RLS where applicable. |
| Realtime operator data | Supabase Realtime or application SSE | Cloudflare Durable Objects for selected realtime state | INTEGRATE | Keep event contracts Nexus-owned. |
| Durable workflows | Temporal Cloud | Trigger.dev / managed queue for simpler jobs | INTEGRATE | Temporal is MIT and designed for durable execution. |
| Low-code automation | n8n only under appropriate commercial terms | Windmill commercial / internal-only | CONDITIONAL | Client-hosted/embedded/managed-service licensing requires care. |
| Product integrations / OAuth | Nango Cloud | Direct vendor APIs for strategic/high-volume connectors | INTEGRATE | Strongest acceleration candidate for Shopify, QuickBooks, Google, HubSpot, Stripe and others. |
| Bulk ELT | Airbyte | Vendor-native exports / Fivetran-class service | INTEGRATE | Do not expose Airbyte UI/API as Nexus product without license review. |
| AI gateway | Nexus gateway contract + LiteLLM/Helicone/OpenRouter adapters | Portkey-style commercial gateway | INTEGRATE / EXTEND | Preserve aggregator-first routing and replaceability. |
| AI observability | Langfuse | Helicone | INTEGRATE | Separate telemetry from customer billing truth. |
| Vector/RAG | pgvector first | Qdrant for dedicated vector scale | USE DIRECTLY | Avoid a separate vector DB until requirements justify it. |
| Billing / payment | Stripe Billing | — | USE DIRECTLY | Let Stripe own payment collection and invoices where possible. |
| Usage / credits / entitlements | OpenMeter | Lago | INTEGRATE | OpenMeter Apache-2.0 is attractive; Lago AGPL requires deployment/legal review. |
| Error monitoring | Sentry | equivalent managed service | USE DIRECTLY | Commodity; do not build. |
| Metrics/traces | OpenTelemetry + managed backend | Grafana stack | INTEGRATE | Keep telemetry portable. |
| Support | Chatwoot cloud/self-host or commercial helpdesk | Zendesk/Intercom-class | INTEGRATE | Do not build ticketing. |
| Internal/admin UI | React + proven component/data-grid/chart libraries | React Admin / Refine for admin-only surfaces | EXTEND | Nexus-specific UX remains custom. |
| Forms / intake | schema-driven custom Nexus forms using proven form libs | Formbricks for surveys | EXTEND | Requirement generation, burden score and task linkage are Nexus-specific. |
| E-sign / docs | Documenso or commercial e-sign API | DocuSign/PandaDoc | INTEGRATE | Legal review for signature requirements. |
| Scheduling | Cal.com API / commercial scheduling | Google/Microsoft calendar APIs | INTEGRATE | Avoid building scheduling infrastructure. |
| CI/CD | GitHub Actions | Cloudflare/GitHub native deploy pipelines | USE DIRECTLY | Nexus should orchestrate status, not replace CI. |
| Dependency/security | Dependabot + CodeQL + Renovate + Semgrep-class scanning | commercial SCA/SAST | USE DIRECTLY | Multi-layer scanning. |

## D. DO NOT BUILD FROM SCRATCH

1. Password storage, session issuance, MFA, OAuth/OIDC identity brokering.
2. Organization invitation email/security primitives.
3. Durable job retry engines and workflow history.
4. Generic cron/queue infrastructure unless a hosted platform is demonstrably insufficient.
5. OAuth refresh-token lifecycle for hundreds of third-party APIs.
6. Generic Shopify/QuickBooks/Google/HubSpot/Stripe connectors before evaluating Nango/direct official APIs.
7. Generic ELT connector catalogs.
8. LLM provider SDK normalization.
9. Base token counting/model price catalogs where maintained gateways already expose them.
10. Generic tracing, log indexing, uptime monitoring or error grouping.
11. Credit-card collection, invoice rendering, subscription lifecycle and tax plumbing.
12. Usage-meter aggregation infrastructure unless a specific economics/performance case defeats OpenMeter/Lago/Stripe meters.
13. Generic helpdesk/ticketing.
14. Generic calendar scheduling.
15. Commodity document signing.
16. Generic admin tables/data grids/chart libraries.
17. CI runners, dependency update bots, CVE feeds or secret scanners.
18. Public MCP registry/discovery infrastructure.
19. Generic GitHub/Cloudflare operational MCP servers.
20. Generic support knowledge-base search before evaluating existing support/search products.

## E. Licensing Risk Register

### HIGH / legal-commercial review required
- **n8n** — Sustainable Use License is not a general permissive OSS license. n8n states that hosting/managing client workflows and credentials in your own internal n8n instance requires Enterprise, and embedding requires an Embed license. Do not treat community self-hosting as automatically acceptable for Nexus managed services or resale.
- **Windmill** — AGPL source plus Community Edition/commercial terms. Re-exposing, wrapping, managed-service resale or embedding can require AGPL compliance or a commercial license.
- **Lago** — platform is AGPLv3. Internal/self-host use differs from distributing/embedding into a proprietary customer product. Lago Embedded/commercial terms may be the clean route.
- **Nango** — Elastic License. Generally useful for internal/product integration use, but product exposure, self-hosting and resale must be checked against current ELv2/commercial terms.
- **Airbyte** — ELv2 for most public code/connectors. Airbyte's FAQ says ordinary integration is generally allowed, but selling Airbyte itself or directly exposing UI/API is restricted.

### MEDIUM
- Open-core projects with enterprise-only RBAC, audit logs, SCIM or white-label features (Langfuse and others). Core license can be permissive while required enterprise functionality is commercial.
- Community MCP servers: each server may have an independent license and may proxy APIs whose own terms restrict resale/automation.

### LOW (still record notices)
- MIT / Apache-2.0 / BSD components such as Temporal and Apache-licensed gateways generally fit proprietary commercial systems, subject to notices and dependency review.

## F. Security Risk Register

1. **Archived MCP servers: REJECT for production.** The old `modelcontextprotocol/servers-archived` repository explicitly provides no security guarantees.
2. **MCP write tools:** enforce least privilege, per-project credentials, user confirmation for dangerous mutations, audit logs and allowlists.
3. **Prompt injection:** repository/issues/web content can be hostile. GitHub's official MCP includes lockdown/read-only modes, but lockdown is explicitly not an authorization boundary.
4. **OAuth vault concentration:** Nango or any integration hub becomes a high-value secret store. Require vendor security review, scoped tokens, environment separation and rotation procedures.
5. **Tenant isolation:** never rely solely on organization selection in the frontend. Enforce tenant/org scoping server-side and in database policies.
6. **Workflow credentials:** avoid globally shared client credentials; credentials must be project/tenant scoped.
7. **AGPL/source-available forks:** legal uncertainty is an operational risk because later replacement can be expensive.
8. **Self-hosted observability:** logs/traces can contain prompts, PII, secrets or client data; add redaction and retention controls.
9. **AI gateways:** meter by verified provider response data, but reconcile against invoices; do not trust model-reported cost fields as sole billing truth.
10. **Supply chain:** pin versions, use SBOM/dependency scanning, signed images where available, and staged upgrades.

## G. Custom-Code Gap Analysis

Nexus still needs custom work for:
- Canonical Nexus data model: agency → project → module → work packet → task → approval → artifact → deployment.
- Nicolas-specific command center and customer-specific portal UX.
- Cross-project authorization rules and project-aware invitations.
- Nexus risk-scoring/approval bumpers and hard-stop logic.
- Generated intake/update forms tied to open tasks and burden scale.
- Unified cost allocation by project/client/module plus gross-margin reporting.
- Nexus AI Gateway policy: aggregator routing, BYOK boundaries, retail credit pricing, margins, fallback policy and auditable provider selection.
- Unified event model across GitHub, deployments, workflows, integrations, billing and observability.
- Client deliverable templates and reusable business-system module contracts.
- Marketing qualification logic and Nicolas-specific Systems Assessment workflow.
- Reconciliation jobs between usage meters, gateway logs and provider/vendor invoices.
- Nexus-specific contractor bounded-access workflow and acceptance evidence.

## H. Time-Savings Analysis

Directional estimate versus custom-building equivalent commodity infrastructure:
- Identity/orgs/invites: **2–5 weeks saved**.
- Durable workflows/queues/retries: **3–8 weeks saved**.
- OAuth + first 10–20 client integrations: **6–16+ weeks saved**.
- Billing/metering/credits: **3–8 weeks saved**.
- Observability/support/admin foundations: **3–8 weeks saved**.
- AI gateway/telemetry foundation: **2–6 weeks saved**.

These are overlapping workstreams, not additive calendar promises. With parallelization, the practical effect is making an under-8-week Phase One plausible; building these engines ourselves would make that target materially less credible.

## I. Cost Analysis — when paid is better

Pay when a vendor removes a multi-week infrastructure burden or recurring maintenance obligation.

Strong paid-first cases:
- B2B identity (WorkOS/Clerk) unless self-hosting is a hard contractual requirement.
- Temporal Cloud instead of operating Temporal clusters during Phase One.
- Nango Cloud instead of running an OAuth/token/webhook/sync platform.
- Managed Postgres/Supabase instead of database operations.
- Sentry/managed telemetry/logging instead of a bespoke observability stack.
- Stripe Billing and, if needed, commercial OpenMeter/Lago support.
- Managed support/helpdesk.
- Premium security scanning for repositories with client data if it materially improves coverage.

Open-source/self-hosting is preferable when:
- commercial terms threaten Nexus gross margin at target scale;
- data residency/contracts require it;
- the component is easy to operate;
- the hosted vendor creates unacceptable lock-in;
- the same component must be transferred to a dedicated client environment.

## J. Module Handoffs

- **Worker 1 / Foundation:** evaluate WorkOS vs Clerk, Postgres/Supabase tenancy pattern, authorization boundaries, event schema.
- **Worker 2 / Reuse Scout:** continue evidence collection, licenses, MCP registry and candidate testing.
- **Worker 3 / Client Platform:** React admin primitives, data grid, charts, forms, file management, white-label patterns; do not rebuild auth.
- **Worker 4 / Marketing:** Apollo/Clay-class enrichment, outbound sequencing, email validation/deliverability, scheduling, CRM and attribution APIs.
- **Worker 5 / Sales & Assessment:** CRM, dynamic forms, proposal/doc generation, e-sign and Cal.com/calendar integrations.
- **Worker 6 / Managed Service:** Sentry, OpenTelemetry, uptime/logs/incident tooling, customer health/status reporting.
- **Worker 7 / Integrations:** Nango first; Airbyte for bulk ELT; direct APIs for strategic connectors; enforce per-tenant credentials.
- **Worker 8 / AI Gateway & Economics:** LiteLLM/Helicone/OpenRouter evaluation; Langfuse telemetry; OpenMeter/Lago/Stripe reconciliation.
- **Worker 9 / Support:** Chatwoot/commercial helpdesk, embedded support and knowledge base.
- **Worker 10 / Dev Orchestration:** GitHub Actions, official GitHub MCP, CodeQL, Dependabot, Renovate, Semgrep-class tooling.
- **Worker 11 / Contractor Orchestration:** reuse GitHub/issue/task systems and scoped identity rather than create contractor IAM.
- **Worker 12 / Security/QA (if defined by Control Tower):** license scanning, SBOM, SAST/SCA, tenant isolation tests, MCP permission/prompt-injection tests.
- **Worker 13 / Nicolas Command & Control:** build the thin realtime Nexus operator UI on top of GitHub/deploy/workflow/cost/health APIs; do not replicate underlying consoles.

## Architecture Change Requests

### ACR-02-001 — Separate integration runtime from workflow runtime
Proposal: use a product-integration platform (Nango/direct APIs) for OAuth/API connectivity, and a durable workflow engine (Temporal) for business orchestration. Avoid making one tool responsible for both concerns.

### ACR-02-002 — Separate AI telemetry from billable ledger
Proposal: Langfuse/Helicone traces are operational evidence; customer credits, wholesale cost and retail price should be reconciled into a Nexus-owned billing/metering ledger (OpenMeter/Lago/Stripe + Nexus records).

### ACR-02-003 — MCP trust tiers
Proposal: maintain trust tiers: official vendor remote MCP > official vendor self-host MCP > reviewed maintained community MCP > reference-only. Archived/unmaintained MCP is prohibited in production.

## Evidence / sources inspected

Primary evidence included current official/vendor docs and repositories for:
- Temporal: https://github.com/temporalio/temporal
- n8n licensing: https://support.n8n.io/article/can-i-use-your-license-for-my-use-case and https://github.com/n8n-io/n8n/blob/master/LICENSE.md
- Windmill licensing/self-host: https://github.com/windmill-labs/windmill and https://www.windmill.dev/platform/self-host
- Nango: https://github.com/NangoHQ/nango and https://nango.dev/api-integrations
- Airbyte licensing: https://github.com/airbytehq/airbyte/blob/master/docs/community/licenses/README.md
- Clerk organizations/invitations: https://clerk.com/docs/guides/organizations/overview
- WorkOS AuthKit invitations: https://workos.com/docs/authkit/invitations
- LiteLLM: https://docs.litellm.ai/
- Langfuse licensing/self-hosting: https://github.com/langfuse/langfuse and https://langfuse.com/self-hosting
- Helicone AI Gateway: https://github.com/Helicone/ai-gateway
- OpenRouter: https://openrouter.ai/support
- Lago: https://github.com/getlago/lago
- OpenMeter: https://openmeter.io/docs and https://github.com/openmeterio/openmeter
- MCP Registry: https://github.com/modelcontextprotocol/registry
- GitHub official MCP: https://github.com/github/github-mcp-server
- Cloudflare official MCP servers: https://github.com/cloudflare/mcp-server-cloudflare

## Verification status

Verified from primary/current sources:
- Canonical requirements and repository branch rules.
- Temporal MIT license and durable-execution positioning.
- n8n commercial-license implications for managed client workflows/embedding.
- Windmill AGPL/commercial restrictions described by project docs.
- Nango ELv2/open-source positioning, 1,000+ API claim, multi-tenant OAuth/sync capabilities and current 2026 release activity.
- Airbyte ELv2 licensing model and restriction framing.
- Langfuse core MIT/open-core model.
- OpenMeter Apache-2.0 positioning and current entitlements/usage model.
- Lago AGPL platform license and MIT licensing for its separate agent SDK/MCP repositories.
- Archived MCP server repository is explicitly unmaintained/no security guarantees.
- Official GitHub and Cloudflare MCPs exist and are actively documented.

Not yet production-verified:
- Any candidate inside Nexus runtime.
- Tenant isolation under Nexus data model.
- Exact commercial quotes at expected Nexus volume.
- Provider uptime/SLA fit.
- Performance under Nexus workloads.
- Customer resale/transfer terms for each contract.
- Full security assessment/CVE review of every transitive dependency.
- Every requested marketing/sales/support candidate at the same depth as the foundation candidates.

## Final scouting status

The requested Phase One **research/scouting coverage is complete enough for Control Tower selection and downstream proofs**. Marketing, sales/assessment, support, contractor orchestration, client-platform, authorization/feature flags, webhook/eventing, QA/testing and official MCP candidates were subsequently deepened and are recorded in the expanded registry and dedicated risk/economics artifacts.

This workstream is still labeled **Needs Review**, not Production Verified, because Worker 2 is the scout and has not deployed the shortlisted infrastructure inside Nexus. Exact enterprise quotes also remain contract-specific. These are downstream selection/proof activities rather than undisclosed missing research.

Additional artifacts:
- `LICENSING-RISK-REGISTER.md`
- `SECURITY-RISK-REGISTER.md`
- `COST-TIME-ANALYSIS.md`
- `WORKER-2-HANDOFF.md`
- `CANONICAL-PROPOSED-UPDATE.json`
- `EVIDENCE-SOURCE-LOG.md`

The component registry now also covers fine-grained authorization (OpenFGA), feature flags (Flagsmith/Unleash), webhook infrastructure (Svix/Hookdeck), QA (Playwright/Vitest) and contractor time/cost accounting (Harvest).
