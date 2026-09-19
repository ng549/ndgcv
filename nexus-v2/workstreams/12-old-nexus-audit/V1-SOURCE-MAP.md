# Worker 12 — Nexus V1 Source Map

Status: INSPECTED / Phase One checkpoint
Updated: 2026-09-19
Canonical authority: `nexus-v2/NEXUS-V2-CANONICAL.json` on `nexus-v2`
Working branch: `nexus-v2-p1-12-old-nexus-audit`

## Authority rule
Nexus V2 is a clean rebuild. Nexus V1 is a donor system only. This registry does not migrate code and does not declare any V1 branch authoritative without evidence.

## Repository A — ng549/nexus
Observed branches:
- main
- archive/pre-cleanup-2026-09-12
- cleanup/source-reconciliation-2026-09-12
- recovery/mhc-hud-nx006-production-2026-09-11
- claude/hud-step3
- base44/setup-62438093
- base44/setup-fe791b40
- site

### High-value areas
- `cleanup/source-reconciliation-2026-09-12/NEXUS-SOURCE-MANIFEST.md`: technical source/deployment reconciliation.
- `recovery/mhc-hud-nx006-production-2026-09-11/recovery/mhc-hud-nx006/`: recovered current-historical Worker source, tests, config and acceptance criteria.
- `claude/hud-step3/hud/`: older HUD implementation; reference only.
- `base44/*/Nexus Website/`: divergent website/app experiments; high contamination risk.
- `site`: historical mixed marketing/workspace assets.

### Verified historical evidence
The source manifest classifies `mhc-hud.nexus-hud-mmc.workers.dev` as the then-current Nexus sign-in application, `broad-cherry-786a...` as OLD NEXUS marketing/mixed development, and `nexus-hud...` as OLD NEXUS legacy HUD. The recovered NX-006 package records deployment version `cee8c13-bfba-4eb4-847f-dbd0d69872d9`, 23 automated tests passed at recovery time, and explicitly says the recovery branch is not a deployment branch.

## Repository B — ng549/Merchant-PRO
Primary donor path: `apps/mhc-console`
Known/observed Nexus branches:
- feature/mhc-project-foundation
- feature/nexus-approved-shared-design
- feature/nexus-button-depth-mobile-header
- feature/nexus-callback-sync
- feature/nexus-connection-check
- feature/nexus-control-panel-menu
- feature/nexus-functional-controls
- feature/nexus-header-location-menu
- feature/nexus-invitation-email
- feature/nexus-invitations-48h-project
- feature/nexus-task-search
- fix/mobile-menu-accessibility
- fix/nexus-acceptance-revision-gates
- fix/nexus-codex-api-key-env
- fix/nexus-executor-default-registration
- fix/nexus-pinned-cli-startup
- fix/nexus-preserve-executor-settings
- fix/nexus-search-bundled-runtime
- fix/nexus-worker-progress-reporting
- grok/nexus-india-layout
- grok/nexus-india-visual-skin
- grok/nexus-operator-control
- grok/nx-028-nexus-grok-control
- test/nexus-worker-smoke
- maintenance/nexus-artifact-cleanup-20260916
- codex/nexus-grok-build-priority

### High-value areas
- `apps/mhc-console/src/index.js`: monolithic historical platform/router/auth/project surface.
- `apps/mhc-console/src/membership.js`: membership/invitation Durable Object logic.
- `apps/mhc-console/src/nexus-account-ui.js`: profile/project people/invitation UI.
- `apps/mhc-console/src/nexus-tasks.js`: Nexus self-build task catalog and dependency metadata.
- `apps/mhc-console/src/assistant.js`: Quark provider-neutral rules, explanation depth, BYOK non-fallback rule.
- `apps/mhc-console/src/quark-character.js`: historical character rendering/animation.
- `apps/mhc-console/src/nexus-shared-theme.js`: historical shared visual system/header/task-board styling.
- `scripts/nexus/runner.mjs`: governed draft-build runner with callback/status flow.
- `.github/workflows/nexus-executor.yml`: historical worker execution workflow.
- `apps/mhc-console/qa/` and `test/`: valuable acceptance intent and regression evidence.

## V2 related sources inspected
Worker 1 Control Tower:
- `nexus-v2-control-tower/CONTROL-TOWER-CONTRACT.md`
- `nexus-v2-control-tower/SHARED-ENTITIES.md`
- `nexus-v2-control-tower/module-registry.json`

Worker 2 Reuse Scout:
- `nexus-v2/research/reuse-scout/PHASE-ONE-REUSE-SCOUT.md`
- `nexus-v2/research/reuse-scout/WORKER-2-HANDOFF.md`
- `nexus-v2/research/reuse-scout/REUSABLE-COMPONENT-REGISTRY.csv`

Worker 2 materially changes the reuse bar for commodity capabilities: WorkOS/Clerk for identity, Temporal/Trigger.dev for durable jobs, Nango for multi-tenant connectors, Stripe/OpenMeter for billing/metering, LiteLLM/OpenRouter/Langfuse for AI routing/observability, and Sentry/OpenTelemetry for observability should compete directly with V1 custom code.

## Source-quality warning
A branch named `fix/*` is not evidence the fix is current or complete. Several fix branches are dozens or hundreds of commits behind `feature/mhc-project-foundation`; divergent patches must be evaluated by capability and provenance, not branch age/name.
