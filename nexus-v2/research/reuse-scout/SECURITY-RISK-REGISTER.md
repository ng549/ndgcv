# Nexus V2 — Security Risk Register

Date: 2026-09-19

| Risk | Severity | Affected area | Required control |
|---|---|---|---|
| Cross-tenant data access due to missing server-side scope | Critical | Entire platform | Tenant/project IDs enforced server-side and at DB policy layer; automated isolation tests |
| Shared/global OAuth credentials leaking across clients | Critical | Integrations/MCP | Per-tenant connection IDs; never silently fall back to operator credentials |
| Unattended financial writes | Critical | Stripe/accounting MCPs | Read-only default; explicit approval for charge/refund/invoice/accounting mutations |
| Prompt injection via external records | Critical | MCP/agents | Treat tool output as untrusted; restrict tools; approval gates; context separation; output sanitization where appropriate |
| Production DB agent mutation | Critical | Supabase/Postgres | Project-scope + read-only by default; migrations only through controlled dev/review pipeline |
| OAuth credential vault compromise | High | Nango/integration hubs | Vendor review, scoped tokens, encryption, environment separation, rotation/revocation drills |
| Logs/traces contain prompts, secrets or PII | High | Langfuse/Sentry/Better Stack | Redaction, sampling, retention limits, least-privilege access |
| Webhook replay/duplication | High | Billing/integrations | Signature validation, idempotency keys, replay windows, event ledger |
| Billing meter divergence from vendor invoices | High | AI/billing | Reconciliation jobs; never make observability cost field sole source of customer bill |
| Supply-chain compromise | High | OSS/dependencies | Pin versions, lockfiles, Dependabot/Renovate, CodeQL/Semgrep-class scans, SBOM and staged upgrades |
| Unmaintained MCP/community connector | High | MCP | Tiering policy; reject archived/unmaintained servers for production |
| Overbroad GitHub/Cloudflare agent tokens | High | Development/infra | Fine-grained tokens, environment separation, approval for deploy/secret/permission changes |
| Cold-email domain damage or legal violation | High | Marketing | Dedicated sending domains, opt-out/suppression, jurisdictional controls, volume ramping, verification and monitoring |
| Data enrichment provenance/privacy risk | High | Marketing | Provider terms, DPA, suppression, minimization, lawful-basis review by geography/use case |
| Workflow engine runaway retries/cost | Medium-High | Temporal/automation | Retry policies, dead-letter/manual intervention, spend/rate controls |
| Low-code platform becomes shadow source of truth | Medium | Retool/Appsmith/n8n | Nexus system-of-record contracts; tools are execution/UI layers only |
| Vendor outage blocks critical process | Medium | SaaS dependencies | Graceful degradation, queued retries, exports/backups, replacement plan |
| Source-available license change | Medium | Open-core stack | Pin license/version and reevaluate before major upgrades |
| Preview API/MCP behavior changes | Medium | Google Workspace preview | Feature flag, non-critical initial use, compatibility tests |

## Security rejection criteria

Reject a candidate for production when any of the following is true:
- abandoned/unmaintained with production credentials;
- no credible secret storage for required use;
- cannot scope access to a tenant/project;
- destructive tools cannot be separated or gated;
- unresolved critical vulnerability affects the deployed version with no viable mitigation;
- license/update path blocks security patches;
- dependency/install method executes opaque remote code without an acceptable trust path.

## MCP-specific evidence

Supabase's own MCP guidance recommends project scoping, read-only mode and narrow feature groups for production evidence, and warns that prompt injection remains possible even with wrapper instructions:
https://supabase.com/docs/guides/ai-tools/mcp

Cloudflare now supports MCP Server Portals, Gateway routing/DLP and MCP traffic detection. These are strong candidates for Nexus's central MCP control layer:
https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/
https://developers.cloudflare.com/changelog/post/2026-03-20-mcp-portal-gateway-routing/
https://developers.cloudflare.com/changelog/post/2026-08-12-mcp-detection-and-dashboard/
