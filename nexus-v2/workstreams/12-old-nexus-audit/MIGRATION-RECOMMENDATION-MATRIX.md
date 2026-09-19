# Migration Recommendation Matrix

Status: INSPECTED / recommendations only. No migration performed.

| Candidate | Primary classification | Why | External alternative / V2 direction |
|---|---|---|---|
| Agency/project model | REBUILD | Correct concept, contaminated hardcoded implementation. | Worker 6 tenant/org/project entities. |
| Access/roles concepts | REBUILD | Multiple authorities/email keys. | WorkOS/Clerk spike per Worker 2 + V2 permissions. |
| 48h invitations | REBUILD | Requirement good; implementation drifted. | Managed identity invitations. |
| Control Panel profile/member UX | ADAPT | Useful IA and interaction concepts. | Worker 11 shell + Worker 6 APIs. |
| Task metadata/acceptance | ADAPT | Strong governance concepts map to Work Packets. | Worker 9 contract. |
| Task search | REBUILD | Fragmented lineage. | Search canonical Work Packet read model. |
| Acceptance/revision gates | ADAPT | Strong V2 fit and Golden Rule alignment. | Worker 9. |
| Codex executor | REBUILD | Safety model useful, infrastructure tightly coupled. | Worker 9 + Temporal/managed runner evaluation. |
| Grok operator control | REFERENCE ONLY | Preserve parallel-worker UX/policy, not duplicate stack. | Worker 9 provider adapters. |
| Quark product behavior | ADAPT | Approved behavior valuable. | Worker 8/11/13 contracts. |
| Quark approved visual reference | ADAPT | Approved asset/reference potentially reusable. | Worker 11 provenance validation. |
| Quark old renderer | REBUILD | Brittle DOM/CSS/atlas coupling. | New tested motion component. |
| Shared design CSS | REBUILD | Approved look, override-heavy implementation. | Worker 11 design tokens/components. |
| Header/mobile QA | REFERENCE ONLY | Excellent acceptance evidence, old implementation not desirable. | Worker 11 visual regression. |
| Adaptive customer forms | REBUILD | Requirement exists, no verified implementation. | Worker 6/9/11. |
| AI cost ledger | REBUILD | Wrong money/storage model for V2. | Worker 8 raw events + Worker 10 ledger; OpenMeter/Stripe. |
| Billing reconciliation scripts | REFERENCE ONLY | Provider quirks useful; MHC/Sheet coupling too high. | Worker 10 adapters. |
| BYOK non-fallback policy | REFERENCE ONLY | Binding rule, not reusable credential subsystem. | Worker 8 hard-fail isolation. |
| OAuth/session custom stack | REBUILD | High security/maintenance burden. | WorkOS/Clerk; server-side session/token custody. |
| Recovered Worker package | REFERENCE ONLY | Provenance/history only. | No code import. |
| Source reconciliation manifest | REFERENCE ONLY | Saves investigation time. | Worker 1 canonical governance. |
| Deployment workflow | REFERENCE ONLY | Verification stages useful; old branch/secrets coupling. | V2 CI/CD promotion architecture. |
| MHC-specific HUD model | DISCARD | Project-specific, dual-source assumptions. | Rebuild later inside Merchant PRO/MHC module. |
| Cabinet-specific core code | DISCARD | Project-specific contamination. | Rebuild in Cabinet module. |

## KEEP AS-IS assessment
No serious V1 candidate met the KEEP AS-IS bar: isolated, clean, V2-compatible, secure and worth preserving nearly unchanged. This is intentional, not a blanket anti-reuse decision.
