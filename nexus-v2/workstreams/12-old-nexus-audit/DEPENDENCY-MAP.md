# Dependency Map

Status: INSPECTED / V1 dependency reconstruction.

## Platform dependency graph
- Browser UI → Cloudflare Worker `mhc-hud`.
- Worker → Google OAuth for identity.
- Worker → Durable Objects: `NEXUS_ASSISTANT`, `NEXUS_EXECUTION`, `NEXUS_MEMBERSHIP`; historical `NEXUS_VAULT` binding preserved but not routed.
- Worker → Google Drive/Sheets for MHC HUD/control data and research/audit artifacts.
- Worker → GitHub API for repository status/commands.
- Worker → xAI/OpenAI/Perplexity for AI/research.
- Worker → GitHub Actions callback/executor for governed code drafts.
- GitHub Actions executor → old Worker callback + Codex CLI + GitHub PR creation.
- Cost reconciliation Actions → Google Cloud billing export / xAI management API / Cloudflare billing API → MHC Google Sheet.
- UI/design → approved image/brand assets embedded in source + large CSS/JS shell.

## Capability coupling
- Project access depends on Google identity + env allowlists + env project JSON + hardcoded project records + membership DO.
- Invitations depend on membership DO + Google identity callback.
- Quark depends on assistant DO + provider keys + project scope resolver + Control Panel preference state.
- Task execution depends on static task definitions + task state DO + GitHub Actions + callback secret + branch/path allowlists.
- Costs depend on AI provider response usage + Google Sheet + external billing APIs.
- Deployment depends on GitHub Actions + Wrangler + Cloudflare token/account + secrets.

## V2 destination implications
- Worker 6: identity, tenant, organization, user, membership, project.
- Worker 7: connector abstraction and provenance.
- Worker 8: AI providers, BYOK, AI usage events.
- Worker 9: Work Packets, execution, approvals, builder/reviewer/tester evidence.
- Worker 10: normalized costs, billing, monitoring.
- Worker 11: shell/design/Quark presentation.
- Worker 13: Nicolas operator read model/commands.
- Worker 1: shared contracts, audit envelope, canonical reconciliation.

High-contamination dependency clusters: old Worker monolith, membership/auth composition, executor callbacks, Sheet-based cost ledger, project-specific Google assets.
