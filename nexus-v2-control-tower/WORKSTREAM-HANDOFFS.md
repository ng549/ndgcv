# Workstream handoffs

Shared input baseline: Control Tower commit `4f278477855b02c11c73ca9599cc87a5d0190e8d`; continuation additions must be pinned to the next verified commit before adoption. Every worker reads the integration canonical first. These are repository handoffs, not messages sent to workers.

| Worker | Registry ID | Assigned branch | Required reconciliation/output |
|---|---|---|---|
| 2 | `reuse-scout` | `nexus-v2-p1-02-reuse-scout` | Correct module mapping; add version/commit and candidate-level evidence; submit machine-readable contract. |
| 3 | `business-model` | `nexus-v2-p1-03-business-model` | Resolve offer/service boundaries, dedicated thresholds, margin and ownership rules with 6/10. |
| 4 | `marketing` | `nexus-v2-p1-04-marketing` | Define qualified-lead payload and consent/attribution boundaries with 5/7. |
| 5 | `sales-assessment` | `nexus-v2-p1-05-sales-assessment` | Accept qualified-lead handoff and define assessment-to-work-packet boundary with 9. |
| 6 | `client-platform` | `nexus-v2-p1-06-client-platform` | Own tenant/client/project/user/membership; reconcile shared auth context with 13 and BYOK scope with 8. |
| 7 | `integrations` | `nexus-v2-p1-07-integrations` | Define connector secrets, transport, sync and provenance; reconcile ACR-0002 and ACR-0004. |
| 8 | `ai-gateway` | `nexus-v2-p1-08-ai-gateway` | Define AI routing/rights/BYOK/measurement; reconcile raw usage versus ledger in ACR-0003. |
| 9 | `build-orchestration` | `nexus-v2-p1-09-build-orchestration` | Own work packets, builder/reviewer isolation and CI enforcement; consume local contract test command. |
| 10 | `managed-ops` | `nexus-v2-p1-10-managed-ops` | Own entitlements, ledger, audit retention and support; reconcile cost/revenue authority with 3/8. |
| 11 | `design-system` | `nexus-v2-p1-11-design-system` | Own tokens/responsive shell; consume platform identity and scoped API contracts, never private tables. |
| 12 | `old-nexus-audit` | `nexus-v2-p1-12-old-nexus-audit` | Inventory reference-only salvage with explicit license/migration decision; no bulk copy. |
| 13 | `operator-gateway` | `nexus-v2-p1-13-operator-command-center` | Own Nicolas session, protected entry and read models; consume owner APIs and enforce authorization. |

All owners return a `module-contract.schema.json`-conforming contract, pinned input versions, owned/prohibited data, security boundaries, evidence, unresolved decisions and exact source commit. Empty or absent submissions are pending, never accepted. Research-only outputs do not imply production readiness. Run `bash nexus-v2-control-tower/tests/validate-contracts.sh` for the local shared baseline; Workstream 9 must design and enforce the CI gate separately.

Integration order: 1/2 first; 7/8 boundary drafts alongside 6 identity; then 3/4/5/9/10/11/12 contracts; 13 may draft immediately after the first Control Tower draft. Runtime dependency graphs differ from this Phase One draft-start order. Conflicts become ACRs before selective integration. No worker must wait for another module's production implementation just to produce its Phase One draft.
