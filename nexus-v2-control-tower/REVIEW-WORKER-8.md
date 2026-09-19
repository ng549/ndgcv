# Independent Worker 8 reconciliation review

Pinned source: `62f27be5eb0e4d32fe419ac3d4834ff59864afb7`.
Reviewer: separate read-only `review_control_tower` agent. Date: 2026-09-19.
Disposition: **Blocked for shared-contract integration**, not a finding of runtime exploitation.

| Finding | Evidence | Required owner revision |
|---|---|---|
| Shared request context incompatible | Closed ai-request schema lacks scope, tenant_id and actor context; empty org/project with missing tenant/actor passes offline validation | Reconcile authenticated context with 6/13 and add negative fixtures. Stateless connector definitions need not carry tenant context; authenticated requests do. |
| Mutation identity gap | operator-command schema lacks shared scope/idempotency fields | Define operator-session mapping and idempotent command contract with 13. |
| Missing composed event envelope | Usage/cost event schemas use event_id/occurred_at with no CloudEvents wrapping contract | Define payload plus envelope mapping and composed tenant/system fixtures. |
| Unsupported fixture-pass claim | Checked-in validate-contracts.mjs parses JSON and checks four headers; no metaschema or instance validation | Correct handoff claim and add executable positive/negative instance tests. Node script exits 0 but is not those tests. |
| Adjustment integrity | Separate offline validation accepted ADJUSTMENT without adjusts_event_id or tenant/project allocation and inconsistent profit | Require adjustment provenance; define scope/allocation; test arithmetic with Managed Ops. |
| Precision mismatch | README integer micros versus shared minor-unit rule | ACR-0006: agree exact measurement scale, currency-aware conversion and rounding before integration. |
| Hard-cap contradiction | Entitlement schema accepts allowed=true with hard_cap_reached=true | Add conditional rejection or a named semantic gate, with an isolated negative fixture. |
| Ownership unresolved | Worker 13 described as UI-only; Worker 8 owns wallet contract while 10 implements it; formal module contract absent | 13 owns operator session/authorization surface; clarify 10's ledger/schema authority and 8's measurement/consumer interface. |
| Evidence/status consistency | NEEDS_REVIEW differs from canonical status spelling; README both claims Scout reconciliation and lists findings unavailable | Normalize status and distinguish historical evidence from current unresolved inputs. |

All twelve Worker 8 schemas passed independent Draft 2020-12 metaschema checks. This verifies schema syntax, not instance safety, rights, production isolation, provider reliability or economics. No source-worker files were edited. Owner revisions and fresh independent review are required before selective integration.
