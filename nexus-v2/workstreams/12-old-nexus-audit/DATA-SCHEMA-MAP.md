# Data / Schema Map

Status: INSPECTED. V1 shapes mapped to V2 Control Tower entities; no schema migration authorized.

| V1 concept | V1 source | V2 entity/owner | Compatibility | Migration risk |
|---|---|---|---|---|
| Project record | `DEFAULT_PROJECT_RECORDS` + project registry DO | Project / Worker 6 | CONCEPT REUSABLE; shape incompatible | Hardcoded core projects, embedded emails, UI metadata mixed with domain data. |
| User profile | membership DO `profiles[email]` | User / Worker 6 | PARTIAL | Email used as primary key; profile and auth subject conflated. |
| Membership | `members[project+email]` | Membership/Role / Worker 6 | CONCEPT REUSABLE | No tenant/org identity; role labels coupled to project ID/email. |
| Invitation | membership DO | Identity invitation / Worker 6 | INCOMPATIBLE | Historical expiry/use semantics conflict with approved 48h reusable requirement. |
| Task definition | `NEXUS_TASKS` | Work Packet / Worker 9 | REQUIREMENTS SOURCE | Static catalog mixes roadmap, execution path, acceptance and UI copy. |
| Task mutable state | Nexus task DO merged by `mergeNexusTaskState` | Work Packet state/events / Worker 9 | PARTIAL | Separate static/mutable sources and bounded history arrays. |
| Assistant memory | assistant DO namespaced by project/email | Copilot memory context / Worker 8 + platform | CONCEPT REUSABLE | Merchant PRO special-case namespace; provider/runtime coupling. |
| Project/global scope | `resolveAssistantMemoryScope` | authorization context / Worker 6/8 | CONCEPT REUSABLE | Must use explicit capabilities, not project-name conditionals. |
| Cost row | Sheet Cost Ledger | Cost Event / Worker 8 producer + Worker 10 ledger | INCOMPATIBLE | JS Number USD only, mutable Sheet, no immutable event/idempotency contract. |
| Reconciliation row | Sheet reconciliation tab | normalized billing event / Worker 10 | PARTIAL CONCEPT | Provider/project-specific, USD assumptions. |
| Execution job | `NEXUS_EXECUTION` DO | Work Packet execution / Worker 9 | CONCEPT REUSABLE | Old callback URL, branch/path coupling. |
| Audit list | membership/assistant bounded arrays + logs | Audit Event / Worker 10 storage, producer emission | INCOMPATIBLE | Multiple local formats, bounded truncation, no shared envelope. |
| Integration state | HUD/source-specific status objects | Connector + health / Worker 7 | CONCEPT REUSABLE | Presentation-derived state not canonical connector model. |
| MHC HUD data | Drive JSON + Sheet tabs | Merchant PRO/MHC module data | PROJECT-SPECIFIC | Must not enter V2 core schema. |
| Cabinet fields | hardcoded project metadata + Cabinet renderer | project module data | PROJECT-SPECIFIC | Keep out of core except generic Project identity/config. |

## Duplicated concepts found
- project authorization represented by env allowlist, env project JSON, project record ownership arrays, and membership DO.
- project registry represented by hardcoded defaults plus DO custom records.
- task truth represented by static source definitions plus saved state plus historical Control Center sheets.
- cost truth represented by metered rows plus provider reconciliation rows.
- audit/history represented independently in membership, assistant, task and workflow logs.

## V2 mapping rules
Do not migrate email-keyed maps, hardcoded project records, Sheet rows, or Durable Object storage layouts. Preserve only domain concepts that match Control Tower entities. Any data migration in Phase Two needs explicit transform, tenant attribution, source provenance, dedupe rules and rollback.
