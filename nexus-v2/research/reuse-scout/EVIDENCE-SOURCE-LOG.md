# Nexus V2 — Worker 2 Evidence & Source Log

Date: 2026-09-19

This log records the primary/current sources materially used during the Phase One reuse scout. A source being inspected does **not** mean its product is approved or production verified.

## Canonical / repository
- `ng549/ndgcv`
- `nexus-v2/NEXUS-V2-CANONICAL.json` on branch `nexus-v2`
- Branch comparison confirmed the Worker 2 branch is isolated from `nexus-v2`.

## Identity / organizations
- https://workos.com/pricing
- https://workos.com/docs/authkit/users-organizations
- https://workos.com/docs/authkit/sso
- https://clerk.com/pricing
- https://clerk.com/docs/guides/billing/for-b2b

## Data / realtime / authorization / feature flags
- https://supabase.com/pricing
- https://supabase.com/docs/guides/ai-tools/mcp
- https://github.com/openfga/openfga
- https://www.flagsmith.com/pricing
- https://docs.getunleash.io/support/availability
- https://www.getunleash.io/blog/unleash-moving-to-agplv3
- https://www.getunleash.io/pricing

## Workflow / automation
- https://temporal.io/
- https://go.temporal.io/platform-hub/cost
- https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- https://n8n.io/legal/eula/
- https://www.windmill.dev/terms/2025-12-01

## Integrations / webhooks / ELT
- https://nango.dev/api-integrations
- https://nango.dev/pricing
- https://airbyte.com/blog/move-to-elv2
- https://airbyte.com/blog/update-on-airbytes-license
- https://www.svix.com/
- https://github.com/svix/svix-webhooks/blob/main/LICENSE
- https://github.com/svix
- https://hookdeck.com/

## AI gateway / observability
- https://www.litellm.ai/
- https://www.litellm.ai/pricing
- https://openrouter.ai/pricing
- https://openrouter.ai/support
- https://www.helicone.ai/pricing
- https://langfuse.com/pricing
- https://langfuse.com/pricing-self-host
- https://langfuse.com/self-hosting/license-key
- https://langfuse.com/blog/2025-06-04-open-sourcing-langfuse-product

## Billing / metering
- https://stripe.com/billing/pricing
- https://stripe.com/pricing
- https://openmeter.io/
- https://github.com/openmeterio/openmeter
- https://github.com/getlago/lago

## Marketing / CRM / sales
- https://docs.apollo.io/docs/api-pricing
- https://docs.apollo.io/reference/people-enrichment
- https://www.clay.com/pricing
- https://university.clay.com/docs/ai-pricing
- https://www.smartlead.ai/pricing
- https://helpcenter.smartlead.ai/en/articles/439-smartlead-pricing-plans
- https://www.hubspot.com/pricing
- https://www.hubspot.com/pricing/sales
- https://www.hubspot.com/products/crm
- https://support.pipedrive.com/en/article/how-does-pricing-work-in-pipedrive
- https://cal.com/pricing
- https://documenso.com/pricing
- https://docs.documenso.com/docs/policies/licenses
- https://docs.documenso.com/docs/policies/enterprise-edition
- https://formbricks.com/pricing
- https://formbricks.com/license-agreement

## Client platform / internal tools
- https://retool.com/pricing
- https://www.appsmith.com/pricing
- https://www.appsmith.com/terms-and-conditions
- https://www.ag-grid.com/license-pricing/
- https://www.ag-grid.com/eula/commercial/
- https://plane.so/pricing
- https://plane.so/legals/eula

## Observability / support
- https://betterstack.com/pricing
- https://betterstack.com/docs/getting-started/integrations/mcp/
- https://www.chatwoot.com/pricing
- https://www.chatwoot.com/pricing/self-hosted-plans
- https://github.com/security/plans
- https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security

## Development / QA / contractors
- https://github.com/pricing
- https://playwright.dev/docs/intro
- https://vitest.dev/
- https://www.getharvest.com/pricing
- https://help.getharvest.com/api-v2/users-api/users/cost-rates/
- https://help.getharvest.com/api-v2/users-api/users/billable-rates/

## MCP
- https://registry.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/registry
- https://github.com/modelcontextprotocol/servers-archived
- https://github.com/github/github-mcp-server
- https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/
- https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/
- https://developers.cloudflare.com/changelog/post/2026-03-20-mcp-portal-gateway-routing/
- https://developers.cloudflare.com/changelog/post/2026-08-12-mcp-detection-and-dashboard/
- https://developers.google.com/workspace/guides/configure-mcp-servers
- https://developers.google.com/workspace/tools-safety
- https://workspaceupdates.googleblog.com/2026/05/agent-tools-and-security-updates-for-workspace-developers.html
- https://developers.hubspot.com/ai-tools/mcp
- https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available
- https://marketplace.stripe.com/apps/stripe-mcp
- https://supabase.com/docs/guides/ai-tools/mcp
- https://betterstack.com/docs/getting-started/integrations/mcp/

## Evidence grades used

- **VERIFIED DOCS / VERIFIED LICENSE / VERIFIED PRICING:** current primary source inspected.
- **RESEARCHED:** credible source(s) inspected, but exact version/license/contract/runtime was not completely pinned.
- **DISCOVERED:** candidate exists; not enough evidence for recommendation.
- **HOLD / UNVERIFIED:** missing evidence prevents adoption recommendation.
- **REJECT:** evidence supports exclusion for production (for example, archived MCP servers with explicit no-security-guarantee notice).
- **PRODUCTION VERIFIED:** intentionally not used by Worker 2 because no shortlisted component was deployed and exercised in a Nexus production environment.
