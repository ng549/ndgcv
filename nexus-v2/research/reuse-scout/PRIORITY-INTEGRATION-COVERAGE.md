# Nexus V2 — Priority Integration Coverage Matrix

Date: 2026-09-19

This matrix tells implementation workers when the preferred path is official API/MCP, Nango, or another abstraction. It is not permission to write to production systems without project-scoped credentials and approval policy.

| System | Official API | Official webhooks/events | Official MCP | Preferred Nexus Phase One path | Notes |
|---|---|---|---|---|---|
| Shopify | Yes — GraphQL Admin API is the required path for new public apps | Yes — webhook subscriptions; mandatory compliance topics apply to App Store apps | Yes — official Storefront MCP and Dev MCP surfaces | Direct official API for core merchant data/actions; Nango if it materially reduces auth/sync work; use Storefront MCP only for shopper/agentic-commerce use case | Shopify REST Admin API is legacy; new public apps must use GraphQL Admin API. |
| QuickBooks Online | Yes — Intuit developer APIs | Supported through Intuit platform; exact webhook coverage to verify per endpoint/use | Intuit confirms MCP connectors in supported partner integrations, but no generic public Nexus-compatible endpoint was verified | Direct Intuit API or Nango | Do not claim generic QuickBooks MCP availability until Intuit exposes/documented endpoint usable by Nexus. |
| Xero | Yes — Accounting API and other APIs | Yes | Yes — official open-source local/STDIO MCP; remote MCP beta | Direct API/Nango for production integrations; evaluate local MCP for bounded agent tasks; remote MCP after GA/security review | Revised developer commercial terms effective Mar 2 2026; API data may not be used to train AI/ML models under revised terms. |
| Google Workspace | Yes — Gmail/Drive/Sheets/Calendar/etc APIs | Product-specific push/watch/event mechanisms | Yes — official Workspace MCP servers in Developer Preview | Direct APIs/Nango for production-critical integration today; feature-flag official MCP pilots | Preview status prevents calling Workspace MCP production-proven. |
| HubSpot | Yes | Yes | Yes — remote MCP GA | Official API or Nango for deterministic system workflows; MCP for bounded assistant workflows | OAuth 2.1/PKCE and existing HubSpot permissions should be honored. |
| Pipedrive | Yes | Product/API webhooks available | Yes — native MCP launched June 2026 | Official API or MCP depending deterministic vs assistant workflow | Native MCP inherits user role/visibility and Pipedrive reports action audit trail. |
| Salesforce | Yes | Yes via platform events/change data capture/etc | Yes — Headless 360 open beta; Data 360 and related surfaces have GA components | Official APIs first; MCP only where exact server is GA or beta is explicitly accepted | Headless 360 can expose highly privileged platform actions; narrow scope aggressively. |
| Stripe | Yes | Yes | Yes — official MCP app | Direct API/webhooks for billing runtime; MCP for operator/developer workflows behind hard approval gates | Financial mutation through MCP must not be unattended initially. |
| Square | Yes — commerce/payments/catalog/orders/inventory APIs | Yes | No official production MCP verified in this pass | Direct official API or Nango | Treat payments/refunds/inventory writes as approval-sensitive. |
| NetSuite | Yes — REST/SuiteTalk services | Platform integration/event options vary | No official production MCP verified in this pass | Direct official API or Nango/other enterprise integration layer | Enterprise ERP complexity warrants connector-specific proof before promising support. |

## Architecture rule

- **Deterministic business integration** (billing, inventory sync, order processing, accounting posting): prefer official API/webhook or Nango-backed deterministic integration.
- **Assistant interaction** (query/update CRM from an operator copilot): official MCP is attractive when permission boundaries are clear.
- **Bulk historical replication/warehouse movement:** use Airbyte-class ELT rather than MCP.
- **Never use MCP merely because it exists** when API/webhook semantics are more testable and easier to reconcile.

## Primary sources inspected

- Shopify auth and Admin API: https://shopify.dev/docs/apps/build/authentication-authorization
- Shopify webhooks: https://shopify.dev/docs/api/webhooks/latest
- Shopify Storefront MCP: https://shopify.dev/docs/apps/build/storefront-mcp
- Shopify Dev MCP: https://shopify.dev/docs/api/polaris/using-mcp
- Xero developer platform / AI Toolkit / pricing: https://developer.xero.com/ ; https://developer.xero.com/ai ; https://developer.xero.com/pricing
- Xero remote MCP beta terms: https://www.xero.com/us/legal/terms/xero-developer-remote-mcp-beta-testing/
- Google Workspace MCP: https://developers.google.com/workspace/guides/configure-mcp-servers
- HubSpot MCP: https://developers.hubspot.com/ai-tools/mcp
- Pipedrive MCP: https://support.pipedrive.com/en/article/mcp
- Salesforce hosted MCP: https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/headless-360-mcp.html
- Stripe MCP: https://marketplace.stripe.com/apps/stripe-mcp
- Intuit/QuickBooks MCP partner evidence: https://www.intuit.com/blog/innovative-thinking/tech-innovation/intuit-perplexity-partnership/
