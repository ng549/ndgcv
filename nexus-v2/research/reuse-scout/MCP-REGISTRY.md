# Nexus V2 — MCP Registry

Date: 2026-09-19  
Worker: 2 — Open-Source, MCP & Reuse Scout  
Status: **Needs Review / Researching** until production tests are complete.

## Trust tiers

- **Tier 1 — Official vendor remote MCP:** preferred when OAuth, least privilege, current documentation and production support are available.
- **Tier 2 — Official vendor self-hosted MCP:** acceptable after version pinning, code/license review and secrets isolation.
- **Tier 3 — Maintained community MCP:** requires code review, license review, release/maintainer check and bounded credentials before use.
- **Tier 4 — Reference only:** no production credentials; archived/unmaintained servers belong here or are rejected.

A registry listing is discovery metadata, not an endorsement.

## Registry

| MCP / infrastructure | Owner | Purpose | Current evidence | Auth / permission model | Nexus classification | Production status |
|---|---|---|---|---|---|---|
| Official MCP Registry | Model Context Protocol project | Public discovery/metadata | Official registry project exists and is active | Registry metadata only | USE DIRECTLY for discovery | VERIFIED existence; registry entries still require independent review |
| GitHub MCP Server | GitHub | Repositories, code, issues, PRs, Actions and security context | Official GitHub project/docs | GitHub auth; read-only and narrower modes available | INTEGRATE | VERIFIED official; Nexus runtime test still required |
| Cloudflare API MCP | Cloudflare | Access to Cloudflare API using search/execute Code Mode | Official docs updated 2026-07-28; 2,500+ API endpoints represented through two tools | OAuth or scoped bearer token | INTEGRATE | VERIFIED official; write scopes require approval gates |
| Cloudflare Observability MCP | Cloudflare | Logs/analytics debugging | Official Cloudflare managed server | OAuth / Cloudflare account permissions | INTEGRATE | VERIFIED official |
| Cloudflare Workers Builds MCP | Cloudflare | Build/deployment status and management | Official Cloudflare managed server | OAuth / account permissions | INTEGRATE | VERIFIED official |
| Cloudflare MCP Server Portals | Cloudflare One | One governed endpoint for multiple upstream MCP servers | Official docs updated 2026-09-10; current MCP 2026-07-28 support | Cloudflare Access plus upstream OAuth | INTEGRATE / SECURITY LAYER | VERIFIED feature; plan/economics not yet quoted |
| Google Workspace Gmail MCP | Google | Search/read/draft/send-capable Gmail tools according to granted scopes | Official developer preview | OAuth 2.0, user Workspace permissions | INTEGRATE AFTER PREVIEW RISK REVIEW | VERIFIED official preview; not GA |
| Google Drive MCP | Google | File search/read/write tools | Official developer preview | OAuth 2.0 | INTEGRATE AFTER PREVIEW RISK REVIEW | VERIFIED official preview; not GA |
| Google Docs MCP | Google | Document operations | Official developer preview | OAuth 2.0 | INTEGRATE AFTER PREVIEW RISK REVIEW | VERIFIED official preview |
| Google Sheets MCP | Google | Spreadsheet operations | Official developer preview | OAuth 2.0 | INTEGRATE AFTER PREVIEW RISK REVIEW | VERIFIED official preview |
| Google Slides MCP | Google | Presentation operations | Official developer preview | OAuth 2.0 | INTEGRATE AFTER PREVIEW RISK REVIEW | VERIFIED official preview |
| Google Calendar MCP | Google | Calendar read/write | Official developer preview | OAuth 2.0 | INTEGRATE AFTER PREVIEW RISK REVIEW | VERIFIED official preview |
| Google Chat MCP | Google | Chat operations | Official developer preview | OAuth 2.0 | CONDITIONAL | VERIFIED official preview |
| Google People MCP | Google | Contacts/people data | Official developer preview | OAuth 2.0 | CONDITIONAL | VERIFIED official preview |
| HubSpot Remote MCP | HubSpot | CRM contacts, companies, deals, tickets, engagements and more | Remote server GA Apr 2026; official docs state read/write on supported CRM objects | OAuth 2.1 with PKCE and existing HubSpot permissions | INTEGRATE | VERIFIED GA; production tenant test required |
| HubSpot Developer MCP | HubSpot | Build/manage HubSpot apps/CMS/serverless functions | GA Feb 2026 | HubSpot CLI/developer auth | INTEGRATE FOR DEV | VERIFIED GA |
| Stripe MCP Server | Stripe | Stripe developer/API operations | Official Stripe Marketplace/docs; free app | Stripe account permissions; supports powerful financial reads/writes | INTEGRATE ONLY WITH HARD APPROVAL GATES | VERIFIED official; never unattended financial writes initially |
| Supabase Remote MCP | Supabase | Database, schema, logs, branches, functions and project operations | Official remote MCP; supports project scope, read-only and feature groups | OAuth; project scoping; read_only option | INTEGRATE FOR DEVELOPMENT/OPS | VERIFIED official; production data use requires narrow read-only mode |
| Better Stack MCP | Better Stack | Uptime, telemetry, dashboards, alerts, incidents, on-call/status pages | Official remote HTTP MCP docs | OAuth recommended or API token | INTEGRATE | VERIFIED official |
| Nango tool/MCP integration layer | Nango | Connect agents to many API integrations through Nango auth/tools | Nango advertises auth with 900+ APIs & MCPs and 6k tools/triggers/syncs | Per-connection OAuth/API credentials | INTEGRATE AS BROKER | VERIFIED vendor capability; exact Nexus architecture test required |
| Lago Agent SDK / MCP repos | Lago | Billing/metering agent operations | Separate Lago agent/MCP components exist; exact selected repo/version must be pinned | Service/API credentials | CONDITIONAL | DISCOVERED/RESEARCHED; do not deploy until exact repo/license/security review |
| Shopify MCP | Shopify | Ecommerce/store operations | No direct official Shopify MCP production candidate verified in this pass | Unknown | HOLD | UNVERIFIED; use Nango/direct Shopify API meanwhile |
| QuickBooks MCP | Intuit | Accounting operations | Google Workspace announced QuickBooks MCP integration, but a directly adoptable official Intuit MCP endpoint for Nexus was not independently verified | Unknown | HOLD | UNVERIFIED for direct Nexus use; use Nango/direct Intuit APIs |
| Accounting MCP — Xero/Sage | Vendors/community | Accounting tools | Nango supports Xero/Sage integrations, but official production MCP endpoints were not verified here | OAuth/API credentials | HOLD | UNVERIFIED |
| CRM MCP — Salesforce | Salesforce/community | CRM operations | Third-party/official ecosystem exists, but exact Nexus candidate not fully verified | OAuth | HOLD pending specific official endpoint review | UNVERIFIED |
| Browser/research MCP | Multiple | Web automation and research | Category is broad and security-sensitive | Browser credentials/session state varies | REFERENCE ONLY until selected | UNVERIFIED |
| modelcontextprotocol/servers-archived | MCP project archive | Historical GitHub/Drive/Postgres/Slack/etc reference servers | Repository explicitly archived/unmaintained and provides no security guarantees | Varies | REJECT | VERIFIED archived; no production credentials |

## Required MCP security controls for Nexus

1. Every connection must be assigned to a Nexus tenant/project and an accountable user/service identity.
2. Default permission is read-only; write permission is an explicit elevation.
3. Destructive, financial, deployment, identity, email-send, record-delete and permission-changing tools require approval gates.
4. Per-project OAuth credentials must never silently fall back to Nicolas/global credentials.
5. Store exact server URL, provider, version/protocol, scopes, owner, license/terms and last review date.
6. Route official remote MCP through a governed portal where practical; Cloudflare MCP Server Portals are a serious fit because Nexus already uses Cloudflare.
7. Log server, tool, actor, project, request ID, approval, result and error metadata.
8. Treat all MCP-returned content as untrusted. Prompt injection can arrive through issue text, emails, CRM records, database rows, webpages or support tickets.
9. Production database MCP access is project-scoped and read-only by default. Supabase's own guidance explicitly recommends project scoping, read-only mode and narrow feature groups for production evidence.
10. Never expose unrestricted SQL, shell, deployment or payment mutation tools to unattended agents.
11. Support a kill switch per server, per tenant and globally.
12. Review OAuth scopes quarterly and on every new capability.
13. Archived/unmaintained community MCP servers are prohibited for production.
14. Preview MCP services must carry a feature-status flag so GA assumptions are not made later.

## Sources inspected

- https://registry.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/registry
- https://github.com/modelcontextprotocol/servers-archived
- https://github.com/github/github-mcp-server
- https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/
- https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/
- https://developers.google.com/workspace/guides/configure-mcp-servers
- https://developers.google.com/workspace/tools-safety
- https://developers.hubspot.com/ai-tools/mcp
- https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available
- https://marketplace.stripe.com/apps/stripe-mcp
- https://supabase.com/docs/guides/ai-tools/mcp
- https://betterstack.com/docs/getting-started/integrations/mcp/
- https://nango.dev/pricing

## Open MCP research items

The registry is not yet production verification. Remaining proof work belongs in Worker 7/8/10/13 integration tests:
- exercise each selected official MCP in a non-production account;
- capture actual OAuth scopes;
- verify read-only behavior;
- test kill switch/credential revocation;
- test prompt-injection handling;
- measure tool schema/context overhead;
- verify logging/audit completeness;
- decide whether Cloudflare MCP Server Portals should be mandatory for all external MCP traffic.
