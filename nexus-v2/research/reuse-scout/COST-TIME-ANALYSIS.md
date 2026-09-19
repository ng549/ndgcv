# Nexus V2 — Cost and Time-Savings Analysis

Date: 2026-09-19

These are directional planning ranges, not vendor quotes unless a price is explicitly labeled as verified from a current official page.

## Time saved versus custom infrastructure

| Capability | Reuse path | Custom-build equivalent | Directional engineering time saved | Calendar impact in parallel Phase One |
|---|---|---:|---:|---:|
| B2B auth/orgs/invites | WorkOS/Clerk | Auth/session/org/invite/MFA/SSO stack | 2–5 weeks | 1–3 weeks |
| Durable workflow engine | Temporal Cloud | Workflow history/retries/timers/signals/worker recovery | 3–8 weeks | 2–4 weeks |
| OAuth integration layer | Nango | Token refresh/vault/connect flows/sync/webhooks across first 10–20 APIs | 6–16+ weeks | 3–6+ weeks |
| AI provider gateway | LiteLLM + Nexus policy | Provider adapters/routing/budgets/fallbacks/rate limits | 2–6 weeks | 1–3 weeks |
| AI observability | Langfuse | Trace store/search/evals/cost dashboards | 2–5 weeks | 1–2 weeks |
| Usage metering | OpenMeter/Stripe | Ingest/idempotency/aggregation/credits/entitlements | 3–8 weeks | 2–4 weeks |
| Payments/invoicing | Stripe Billing | Payment methods/subscriptions/invoices/retries/portal | 4–10+ weeks | 2–4 weeks |
| Support platform | Chatwoot/helpdesk SaaS | Inbox/tickets/attachments/automation/help center | 3–8 weeks | 1–3 weeks |
| Internal tools | Retool/Appsmith/Refine | CRUD/admin tables/filters/forms/permissions shell | 2–6 weeks | 1–3 weeks |
| Monitoring/incident | Better Stack/Sentry/OTel | uptime/logs/traces/alerts/status/on-call | 3–8 weeks | 1–3 weeks |
| CI/security | GitHub Actions/Dependabot/Code Security | runners/scanners/secret detection/update automation | 2–6 weeks | 1–2 weeks |
| Scheduling/e-sign | Cal.com + Documenso API/commercial | availability/booking + signature evidence flows | 3–7 weeks | 1–3 weeks |

The engineering savings overlap; they must not be added into a fake 60-week claim. The practical conclusion is that the under-8-week target is only credible if Nexus buys/reuses most of these commodity layers and focuses custom work on Nexus-specific orchestration, policy, UX, economics and system contracts.

## Verified current prices useful to Phase One decisions

- **WorkOS AuthKit:** up to 1M users free; SSO connections start at $125/connection/month for 1–15 connections. Source: https://workos.com/pricing
- **Clerk:** free tier includes substantial B2B/auth usage; paid Pro/B2B add-on pricing is published. Source: https://clerk.com/pricing
- **Supabase Pro:** starts $25/month, with included quotas and usage overages. Source: https://supabase.com/pricing
- **Nango PAYG:** $50/month including $50 credits; current page lists $0.29/connection/month, $0.72 compute hour and $0.50/GB egress. Source: https://nango.dev/pricing
- **Langfuse Cloud:** Core $29/month, Pro $199/month; Teams add-on $300/month; OSS self-host core free. Source: https://langfuse.com/pricing and /pricing-self-host
- **Helicone:** Hobby free, Pro $79/month, Team $799/month plus usage. Source: https://www.helicone.ai/pricing
- **OpenRouter:** inference pass-through model; plan-dependent free BYOK allowance, then 5% fee over allowance. Source: https://openrouter.ai/pricing
- **Stripe Billing:** PAYG 0.7% of Billing volume; basic Meters up to 100M events/month included; advanced usage billing via Metronome. Source: https://stripe.com/billing/pricing
- **Metronome via Stripe:** current Startup pricing shown as $0.04 per 1K ingest events plus 0.8% billing volume. Source: https://stripe.com/pricing
- **Retool:** annual Team $10/builder + $5/internal user per month; Business $50/builder + $15/internal user; external-user pricing published, Enterprise custom. Source: https://retool.com/pricing
- **Appsmith:** Business $15/user/month; Enterprise $2,500/month for 100 users. Source: https://www.appsmith.com/pricing
- **AG Grid:** Community free; Enterprise $999/developer; grid+charts bundle $1,498/developer including one year updates. Source: https://www.ag-grid.com/license-pricing/
- **Chatwoot:** cloud Startups $19/agent/mo annual, Business $39, Enterprise $99; self-host paid support tiers also published. Source: https://www.chatwoot.com/pricing and /pricing/self-hosted-plans
- **Documenso:** Teams $40/month annual with 5 users; Platform $250/month annual; enterprise custom. Source: https://documenso.com/pricing
- **Cal.com Organizations:** $28/user/month billed yearly; Enterprise custom. Source: https://cal.com/pricing
- **Clay Launch:** starts $167/month on current official pricing page. Source: https://www.clay.com/pricing
- **Smartlead:** Base $39/month, Pro $94, Unlimited Smart $174, Prime $379 on current official page. Source: https://www.smartlead.ai/pricing
- **GitHub Secret Protection:** $19/active committer/month; **Code Security:** $30/active committer/month. Source: https://github.com/security/plans
- **Better Stack:** free tier; paid incident responder begins around $29/month when annual; current telemetry bundles/usage pricing published. Source: https://betterstack.com/pricing

## Paid-over-build decisions

### Buy now / strongly prefer managed in Phase One
- Managed B2B identity.
- Nango Cloud/PAYG for early integrations.
- Temporal Cloud rather than operating a Temporal cluster.
- Supabase/managed Postgres.
- Stripe Billing.
- Managed error/uptime/telemetry.
- Outbound email infrastructure rather than operating mail servers.
- Managed e-sign API/commercial tier if e-sign is required in Phase One.

### Self-host/open source is attractive when
- license is permissive;
- it prevents gross-margin erosion at scale;
- data residency demands it;
- deployment is operationally simple;
- dedicated client transfer is part of the commercial model.

### Do not optimize prematurely
Nexus's target price points ($3K–$50K+ builds and $2K–$10K/month managed service) justify several hundred dollars/month of shared enabling software if it removes engineering weeks and is allocated correctly. The 70% gross-margin target still requires cost allocation by client/project and periodic vendor consolidation.
