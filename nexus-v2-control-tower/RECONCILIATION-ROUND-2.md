# Reconciliation round 2 — 2026-09-19

New source commits arrived during the final branch check. This report supersedes the *availability* and Scout CSV field observations in RECONCILIATION.md; that earlier report remains an accurate pinned historical snapshot.

| Worker | Pinned source | Review result |
|---|---|---|
| 2 Reuse Scout | `2a0227668f85d52dc8719c45232aca98c6129a97` | Nine research artifacts present. CSV now has 27 columns including URLs and maintenance, but lacks a version/commit column; sample entries explicitly state exact release not captured. Incorrect worker numbering persists in handoff. Research is not adoption clearance. |
| 7 Integrations | `9d4015c6f5dc18ce7122a14b7818f4b471a87f5e` | Thirteen changed files, including a proposed global canonical status addition on its own branch. Architecture and connector definition are present; common envelope, tenancy mapping, ownership and admission gates unresolved. |
| 8 AI Gateway | `62f27be5eb0e4d32fe419ac3d4834ff59864afb7` | Eighteen artifacts, including twelve schemas. BYOK and commercial-rights intent are explicit. Shared identity/envelope, precision/ledger boundary and test evidence require reconciliation. |

## Directly verified checks

- All thirteen peer JSON Schemas pass Draft 2020-12 metaschema validation (twelve AI plus one connector).
- Worker 7 connector schema accepts an adversarial definition with empty id/version/provider names, empty auth methods and resources, negative freshness and an unexpected top-level field. This is a schema-admission gap, not proof of a runtime vulnerability.
- Workstream 7's connection-data-model.json is a vocabulary/field list, not an executable validation schema. IntegrationEvent differs from the shared CloudEvents envelope.
- Worker 7 STANDARDS.md assigns economics reconciliation to Worker 8; the shared contract assigns normalized billing/corrections to Managed Ops (Worker 10).
- Worker 7 Completion Report and status claim Complete while shared owner approvals remain open. Its documented validation is JSON parsing/file presence. Control Tower does not accept Complete.
- Worker 7 changed only its branch copy of the global canonical by adding phase_one_worker_updates.worker_7. Integration canonical remains unchanged. This proposed field/status is not automatically adopted and fails the current closed canonical schema until reviewed/versioned.
- Shared-schema module-contract metadata is absent from all three compared artifact lists. Domain-specific schemas do not replace ownership/allowed-path/reviewer/acceptance metadata.
- Worker 8's checked-in validation script is structural inspection, not a JSON Schema instance validator; independent review findings are recorded in `REVIEW-WORKER-8.md`. Additional probes accepted an unlinked financial adjustment and a contradictory allowed/hard-cap decision. Those are contract defects, not demonstrated runtime exploits.

## Reconciliation decisions and owner work

1. Authoritative worker mapping remains the 13-entry registry. Workers 2/7 must correct their handoff routing; Control Tower is architecture governance, not the owner of authentication/database/runtime implementation.
2. Keep the shared explicit scope and tenant identity. Owners may define immutable mappings, but organization/client/project IDs cannot silently substitute for tenant identity. No unsupported cross-tenant/system privilege follows from a schema.
3. Use native CloudEvents as transport envelope; domain payloads may live inside data. Workers 7/8 must specify adapters/fixtures, event type/version and deduplication semantics. See ACR-0005.
4. Raw AI cost precision and invoice minor-unit settlement need an explicit exception/mapping. Managed Ops remains ledger/correction authority. See ACR-0006; it is proposed, not accepted.
5. Require formal module contracts and executable positive/negative evidence before integration. See ACR-0007.
6. Expanded Scout proposals are normalized in ACR-0008 without approving a vendor or deploying an MCP access layer.

## Source proposal mapping

| Source proposals | Control Tower disposition |
|---|---|
| Scout ACR-02-001..003 | Existing proposed ACR-0002..0004 remain open. |
| Scout ACR-02-004..006 | ACR-0008; evidence/ownership principles align, runtime selection pending. |
| Integrations ACR-07-001/002 | ACR-0005; retain shared envelope/identity and request explicit mapping. |
| Integrations ACR-07-003 | Integrations owns normalization/provenance, domain owners own business entity semantics. Require module-contract ownership table; no universal writable entity store approved. |
| Integrations ACR-07-004 | Runtime/secret choices remain with Integrations in coordination with Build Orchestration and Client Platform, subject to research and review. Control Tower reconciles interfaces. |
| AI micros and cost/ledger boundaries | ACR-0006. |
| Evidence and status drift | ACR-0007. |

No owner branch was modified. No source submission was merged. No candidate commercial rights or runtime behavior were independently certified in this reconciliation. Available submissions have been reviewed; revised owner contracts, independent acceptance and remaining module submissions block final integration. Status: **Blocked**, not Complete.
