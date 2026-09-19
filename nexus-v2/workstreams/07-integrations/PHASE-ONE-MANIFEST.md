# Worker 7 Phase One Manifest

Authority: nexus-v2/NEXUS-V2-CANONICAL.json
Branch: nexus-v2-p1-07-integrations

| Required artifact | Location | Phase One status |
|---|---|---|
| A Integration Architecture | INTEGRATION-ARCHITECTURE.md | Designed |
| B Connector Contract | connector-contract.schema.json | Implemented as machine-readable schema / JSON parse validated |
| C Connection Data Model | connection-data-model.json | Implemented as machine-readable model / JSON parse validated |
| D Credential / Secrets Model | STANDARDS.md | Designed |
| E Webhook Standard | STANDARDS.md | Designed |
| F Synchronization Standard | STANDARDS.md | Designed |
| G Mapping / Transformation Standard | STANDARDS.md | Designed |
| H Integration Event Contract | STANDARDS.md | Proposed; Control Tower approval required for global convention |
| I Error Taxonomy | STANDARDS.md | Designed |
| J Connection Health Model | STANDARDS.md | Designed |
| K Initial Connector Catalog | INITIAL-CONNECTOR-CATALOG.csv | Researched/prioritized; no production connector tests claimed |
| L MCP Strategy | MCP-STRATEGY.md | Designed |
| M Security Threat Model | SECURITY-OBSERVABILITY-COST.md | Designed |
| N Observability Requirements | SECURITY-OBSERVABILITY-COST.md | Designed |
| O Cost Tracking Requirements | SECURITY-OBSERVABILITY-COST.md | Designed; Worker 8 reconciliation dependency |
| P Integration Acceptance Tests | ACCEPTANCE-TESTS.md | Test specification created; contract JSON parse checks executed; provider tests pending later implementation |
| Q Handoff Notes | HANDOFF.md | Created |

## Research used
- Worker 2 Reuse Scout artifacts from nexus-v2-p1-02-reuse-scout.
- Nango current product/pricing documentation.
- Merge Unified API and current pricing.
- Paragon integration infrastructure/pricing.
- Shopify GraphQL Admin API/webhooks current docs.
- Google Workspace auth/scope docs.
- Microsoft Graph Outlook change-notification docs.
- HubSpot current webhook/auth documentation.
- WooCommerce current REST v3/webhook docs.
- Amazon Selling Partner API notifications docs.

## Golden Rule classification
The Phase One Worker 7 deliverable is an architecture/contracts workstream, not a connector implementation phase. Required Phase One artifacts are present. Machine-readable JSON artifacts were parsed successfully from the branch. Real provider authentication, data movement, end-to-end tenant isolation, recovery behavior, production load, commercial contracts and production behavior remain unverified and are explicitly not claimed.
