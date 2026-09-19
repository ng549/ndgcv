# Canonical maintenance

Status: draft, Needs Review. Scope: Workstream 1 architecture only.

The authoritative policy remains `nexus-v2/NEXUS-V2-CANONICAL.json` on `nexus-v2`. The current schema is `schemas/canonical.schema.json`, Draft 2020-12, canonical version 0.2. It validates the existing structure and selected routing constants; it does not prove policy compliance. The fixture is a snapshot for regression tests, never a replacement source of truth.

1. Read the current integration commit and canonical before every change; record both commit and blob SHA.
2. Explicit Nicolas decisions supersede prior policy. Record their provenance, exact scope, and date. Never turn a recommendation into approval.
3. Propose policy changes on the assigned workstream branch through an ACR. Operational workstream status belongs in `control-tower-status.json` and the handoff until reconciliation; do not mutate the integration canonical from this branch.
4. Validate changed JSON and schema; review semantic policy changes independently. Closed schema fields require a reviewed schema version change. A schema pass is not authorization.
5. Compare the current upstream blob against the source blob before committing. If changed, re-read and reconcile; never force-push or overwrite newer decisions.
6. Commit bounded files, verify remote content, then update the human-readable mirror and control sheet only with evidenced changes. Record any mirror failure explicitly.
7. Control Tower prepares a selective integration PR after affected owners reconcile contracts. No wholesale Phase One branch merge. Retain source commit, reviewer, accepted paths, tests, exclusions and rollback commit.
8. Preserve superseded decisions and evidence; append corrections instead of silently rewriting history. Do not store credentials or client data in canonicals.

The continuation status file is a subordinate execution record, not a second global policy canonical. It distinguishes completed local checks from missing owner responses, review, integrations and production evidence.
