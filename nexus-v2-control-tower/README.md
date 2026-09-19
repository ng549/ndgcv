# Nexus V2 Control Tower — Phase One

Workstream status: **Blocked** on affected-owner contracts and reconciliation. Local artifacts implemented and tested; not Complete.

This directory contains the first shared architecture contract for Nexus V2. It is isolated from the existing CV application and does not import Old Nexus code.

## Authority order

1. Explicit decisions by Nicolas
2. `nexus-v2/NEXUS-V2-CANONICAL.json` on the `nexus-v2` integration branch
3. Accepted Architecture Decision Records (ADRs)
4. Accepted Architecture Change Requests (ACRs)
5. Module contracts
6. Implementation details

Conflicts move upward for resolution; lower layers never silently override higher layers.

## Contents

- `CONTROL-TOWER-CONTRACT.md` — global boundaries, standards, gates, shared entities, and integration order
- `module-registry.json` — Phase One ownership and dependency registry
- `schemas/module-contract.schema.json` — required machine-readable module handoff shape
- `schemas/domain-event.schema.json` — shared event envelope
- `schemas/architecture-change-request.schema.json` — shared-architecture change request
- `templates/ADR.md` — decision record template
- `control-tower.module-contract.json` — this workstream's machine-readable self-contract
- `tests/` — executable registry, event, and semantic completion fixtures
- `REUSE-RESEARCH.md` — research-before-build evidence and reuse decisions
- `HANDOFF.md` — exact verification state and next integration actions

## Non-goals

- No business module implementation
- No production deployment
- No direct merge into `nexus-v2`
- No Old Nexus migration
- No final technology-stack selection for module-owned concerns

## Continuation artifacts

See `ACCEPTANCE-COVERAGE.md` for the full assigned-scope matrix, `control-tower-status.json` for the subordinate execution record, and `RECONCILIATION.md` for inspected Scout findings. Shared policy remains the integration canonical. New foundation tests reuse the existing check-jsonschema tool at observed version 0.38.0; run the existing shell entry point. These additions do not implement CI or a runtime.
