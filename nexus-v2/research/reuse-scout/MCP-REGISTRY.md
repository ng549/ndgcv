# Nexus V2 — MCP Registry (Phase One)

Status legend: VERIFIED = existence/ownership/current docs checked; RESEARCHED = evidence reviewed but not run inside Nexus; TESTED = actually exercised against a Nexus test environment.

| MCP / Registry | Owner | Purpose | Status | Classification | Security / licensing notes |
|---|---|---|---|---|---|
| Official MCP Registry | Model Context Protocol project | Discovery metadata for public MCP servers | VERIFIED existence | USE DIRECTLY | Registry is preview/still evolving; presence is not a security endorsement. |
| GitHub MCP Server | GitHub | Repos, code, issues, PRs, Actions and security findings | VERIFIED existence/current docs | INTEGRATE | Supports read-only; lockdown reduces some prompt-injection exposure but GitHub says it is not an authorization boundary. |
| Cloudflare MCP servers / Code Mode | Cloudflare | Workers, builds, docs, security/performance and Cloudflare operations | VERIFIED existence/current docs | INTEGRATE | Prefer OAuth/least privilege; put destructive actions behind Nexus approval gates. |
| Stripe MCP | Stripe / ecosystem | Billing/payment operations | RESEARCH REQUIRED | HOLD | Use only official Stripe source/remote endpoint after auth and write-scope review. |
| Nango MCP/tool exposure | Nango | Expose 1,000+ API integrations to agents | VERIFIED vendor capability; NOT TESTED | INTEGRATE | Credential concentration; ELv2/commercial terms; per-tenant connections mandatory. |
| Lago MCP / Agent SDK | Lago | Billing/metering operations | VERIFIED project claim; NOT TESTED | CONDITIONAL | Main Lago platform AGPL; Lago states separate MCP/agent SDK repos are MIT. Verify exact repo before adoption. |
| Google Workspace MCP | Official/provider-maintained candidate needed | Gmail/Drive/Sheets/Calendar actions | RESEARCH REQUIRED | HOLD | Do not use archived reference Google Drive server. Prefer official vendor or strongly maintained implementation with OAuth scopes. |
| Database MCP | Vendor-specific | Query/manage Postgres/Supabase | RESEARCH REQUIRED | HOLD | Read-only by default; no unrestricted production SQL tool for agents. |
| Observability MCP | Vendor-specific | Sentry/log/trace incident investigation | RESEARCH REQUIRED | HOLD | Prefer read-only investigation tools before mutation. |
| CRM MCP | HubSpot/Salesforce/vendor-specific | Leads, contacts, deals | RESEARCH REQUIRED | HOLD | Per-client OAuth and field-level minimization. |
| Ecommerce MCP | Shopify/vendor-specific | Store/customer/order/catalog actions | RESEARCH REQUIRED | HOLD | Start read-only; financial/order writes require explicit approval. |
| Accounting MCP | QuickBooks/Xero/vendor-specific | Accounting records and reports | RESEARCH REQUIRED | HOLD | High-risk financial writes; read-only initial scope. |
| Browser/research MCP | Vendor-specific | Web navigation/research | RESEARCH REQUIRED | HOLD | Prompt injection, credential leakage and browsing isolation concerns. |
| modelcontextprotocol/servers-archived | MCP project archive | Historical GitHub/Drive/Postgres/Slack/etc reference servers | VERIFIED archived | REJECT | Repository explicitly states unmaintained/no security guarantees. |

## Trust policy proposed for Nexus

Tier 1 — official vendor remote MCP with OAuth and documented security.
Tier 2 — official vendor self-hosted MCP with pinned version and security review.
Tier 3 — maintained community MCP after code/license/security review.
Tier 4 — reference-only implementation; never production credentials.

Production rules:
- Server presence in any registry does not equal approval.
- Store exact source URL, version/commit, license and owner.
- Default to read-only.
- Scope tokens to one tenant/project wherever possible.
- Separate discovery credentials from mutation credentials.
- Require human approval for destructive/financial/deployment actions.
- Log every MCP call with user/project/server/tool/result metadata.
- Treat all tool-returned text as untrusted content for prompt-injection purposes.
- Never use archived/unmaintained MCP with production credentials.

## Sources
- https://github.com/modelcontextprotocol/registry
- https://github.com/modelcontextprotocol/servers-archived
- https://github.com/github/github-mcp-server
- https://github.com/cloudflare/mcp-server-cloudflare
- https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/
- https://nango.dev/
- https://github.com/getlago/lago
