# Deployment / Cloudflare Audit

Status: INSPECTED.

## Historical production/recovery topology
Repository `ng549/nexus` source manifest records:
- `mhc-hud.nexus-hud-mmc.workers.dev`: then-current authenticated Nexus sign-in/application.
- `broad-cherry-786a.nexus-hud-mmc.workers.dev`: OLD NEXUS marketing/mixed development.
- `nexus-hud.nexus-hud-mmc.workers.dev`: OLD NEXUS legacy HUD.

The cleanup manifest also records that exact current production source had been missing from GitHub/Drive until a recovery package was captured. Recovery branch:
`recovery/mhc-hud-nx006-production-2026-09-11`.
Recovery manifest identifies Worker `mhc-hud`, deployment evidence version `cee8c13-bfba-4eb4-847f-dbd0d69872d9`, recovered source/tests/config, and 23 tests passed at recovery time. It explicitly warns not to deploy the recovery branch directly.

## Merchant-PRO deployment
Historical later deployment source:
- repository: `ng549/Merchant-PRO`
- app: `apps/mhc-console`
- branch: `feature/mhc-project-foundation`
- workflow: `.github/workflows/deploy-mhc-nexus.yml`
- Worker config: `apps/mhc-console/wrangler.toml`
- Worker name: `mhc-hud`

Workflow behavior:
- push to foundation app/workflow path triggers verify-and-deploy;
- npm install/check/test;
- requires callback secret;
- deploys with Wrangler action;
- syncs billing/callback secrets;
- post-deploy connection verification.

## Cloudflare components
- Workers runtime.
- Durable Objects: assistant, execution, membership; historical Vault binding.
- Worker version metadata.
- observability enabled.
- workers.dev deployment.
- operator-managed vars preserved with `keep_vars=true`.

## Secrets/config dependencies
Observed names include:
- Cloudflare API token/account ID/billing token;
- Google client ID/client secret/session secret;
- Google Drive/Sheet/folder IDs;
- GitHub token/repo/ref;
- xAI/OpenAI/Perplexity keys;
- xAI management/team IDs;
- executor callback secret;
- billing export/service-account federation configuration.

Values were not inspected or copied.

## Known failure modes / debt
- historical Worker 1101 failures reported in project history;
- source-of-truth confusion between old Nexus repo, Merchant-PRO and Cloudflare runtime;
- deployment bridge tied to feature branch;
- numerous executor registration/startup/progress fixes;
- mixed config ownership between wrangler source and Cloudflare dashboard;
- recovery process required production-source extraction.

## Recommendation
Infrastructure concepts: **ADAPT**.
Existing deployment workflow: **REFERENCE ONLY**.
Exact V1 Worker/branch coupling: **DISCARD** for V2 architecture.
V2 should have immutable artifact provenance, staging, environment promotion, rollback, least-privilege secret references, health checks, deployment IDs and Control Tower evidence.
Worker 1 + Worker 9 + Worker 10 own final architecture; Worker 7 owns infrastructure-facing connectors where applicable.
