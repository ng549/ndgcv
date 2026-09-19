# Worker 12 — V1 Branch Lineage Map

Status: INSPECTED / evidence-based partial lineage
Updated: 2026-09-19

## Merchant-PRO anchor
Historical branch `feature/mhc-project-foundation` tip observed at commit `8893eb986a39f4ca09ff817ae1f78ac6461d5a7f`.
That tip is a merge of PR #43 from `feature/nexus-approved-shared-design` with message “Tighten desktop location, weather and account spacing.”

This makes `feature/mhc-project-foundation` a useful late historical aggregation point, not V2 authority.

## Design/header lineage
Evidence-supported sequence:
1. earlier `grok/nexus-india-visual-skin` / `grok/nexus-india-layout` experiments;
2. `feature/nexus-header-location-menu`;
3. `feature/nexus-control-panel-menu` and related shell changes;
4. `feature/nexus-button-depth-mobile-header`;
5. `feature/nexus-approved-shared-design`;
6. merged into `feature/mhc-project-foundation` at `8893eb9...`.

At the foundation tip, automated browser assertions explicitly require:
- date/time above location/weather;
- location and weather centered on the same row;
- location left of weather;
- gap <= about 8–9 px;
- account row follows weather with minimal vertical gap.

Recommendation: preserve these as historical acceptance evidence, not CSS inheritance.

## Invitation/access lineage
- `feature/nexus-invitation-email`: added invitation email helper, account UI changes and tests, but diverged from foundation.
- `feature/nexus-invitations-48h-project`: later evidence at commit `9db04d38abe173d7268b4cfe909ab1838afc0dbd` explicitly requires project selection in Control Panel and reusable 48-hour invitation messaging.
- foundation `membership.js` still contains a seven-day single-acceptance model, showing implementation drift relative to later approved requirement.

Conclusion: product requirement survived; custom invitation implementation did not remain internally consistent. Classification: REBUILD/ADAPT concept, not KEEP.

## Worker/execution lineage
- `fix/nexus-executor-default-registration` commit `79eba46a5f62c8fa518ffd092fac63f426b60526`: registers a GitHub Actions task executor while restricting execution to `feature/mhc-project-foundation`.
- `fix/nexus-codex-api-key-env`: one-line executor environment correction; divergent and historical.
- `fix/nexus-pinned-cli-startup`: CLI startup correction; divergent.
- `fix/nexus-worker-progress-reporting`: runner status-reporting correction; divergent.
- `feature/nexus-connection-check` tip `d96de49a4a6cdd6f14556c299fb4515ee2a14d2b`: added read-only Cloudflare executor settings presence audit.
- `test/nexus-worker-smoke`: isolated smoke workflow.
- `grok/nx-028-nexus-grok-control` -> `grok/nexus-operator-control`: introduced/expanded Grok queue/control-plane files.

The runner architecture contains useful safety concepts: claim persisted job, constrain editable scope, produce draft patch, run checks, publish draft PR, callback honest status, do not auto-deploy/accept. However it is tightly coupled to Merchant-PRO paths, GitHub Actions, the old Worker callback endpoint and specific branches.

Classification: REFERENCE ONLY for controls + REBUILD for V2 Work Packets (Worker 9).

## Search lineage
- `feature/nexus-task-search` predates foundation significantly.
- `fix/nexus-search-bundled-runtime` is also behind foundation.
Therefore names alone do not prove search behavior survived. Preserve arbitrary-text task search as an approved requirement; V2 implementation should use a deliberate search/index strategy.

## Nexus repository lineage
- `claude/hud-step3`: older standalone HUD.
- `recovery/mhc-hud-nx006-production-2026-09-11`: recovered production-era source and tests.
- `archive/pre-cleanup-2026-09-12`: recovery point.
- `cleanup/source-reconciliation-2026-09-12`: source/deployment reconciliation; added `NEXUS-SOURCE-MANIFEST.md`.
- Base44 branches: divergent site/app experiments, not a canonical line.
- `site`: isolated archive artifact.

The recovery branch contains concrete production-era provenance and should be used to understand historical behavior. The cleanup manifest explicitly warns that the repository is mixed and should not be promoted wholesale.

## Lineage interpretation rules
- “ahead” indicates commits not in the comparison base, not product superiority.
- “behind” indicates historical divergence, not necessarily irrelevance.
- merge into foundation is implementation evidence, not V2 approval.
- user-approved behavior must be recorded separately from code.
