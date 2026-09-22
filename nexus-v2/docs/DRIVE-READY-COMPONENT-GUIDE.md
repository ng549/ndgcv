# Drive-Ready Addition — The Agency Global Architecture — Canonical

Paste-ready addition for Google Doc `1N80_JSAO5k02yDcqJp5SPJd2Nwc1MkSY0Gdyb2sSIL8`.
Prepared 2026-09-22. The build environment has no Drive write access (read returned 401), so this is staged here for manual paste. Nothing below has been saved to Drive yet.

---

## Component Guide and Source Directory (v1.0, 2026-09-22)

Reconciled against NEXUS-V2-CANONICAL.json v0.9. Full version with evidence paths, diagram, and worked example: `nexus-v2/docs/COMPONENT-GUIDE-AND-SOURCE-DIRECTORY.md` in ng549/ndgcv.

### Status summary

| # | Component | Status (evidence-backed) |
|---|-----------|--------------------------|
| 1 | Factory/Droid | APPROVED execution provider #1 (6 gates); adapter live-verified 2026-09-22 |
| 2 | ExecutionProvider interface | Implemented in Agency Build Stack (`src/providers/`) |
| 3 | GitHub | Source truth, in force (ng549/ndgcv, branch nexus-v2) |
| 4 | Agency Build Worker GitHub App | Live-verified: ndgcv only; contents+PR write, CI read; workflows:write present (gate in policy); no administration |
| 5 | Infisical vault | Live-verified: org The Agency, project "Agency GitHub Token Broker", env slug `prod`, folder /Github/agency-build-worker (4 entries) |
| 6 | Machine identity agency-github-token-broker | Universal Auth configured + live-verified; path narrowing and TTL/lockout settings NOT verified |
| 7 | GitHub Token Broker | Implemented + live-verified end-to-end (mint → scoped token → live API read) |
| 8 | Identity & Policy Service | Implemented: deny-by-default policy + append-only member registry; 87/87 tests |
| 9 | Work Packet service | Implemented in stack; Worker 9 supervisor IMPLEMENTED_UNVERIFIED, stale canonical pin |
| 10 | Credential Broker | v0 live-verified (GitHub chain); Test 4 prototype was disposable/fake |
| 11 | Integration/MCP Gateway | Stack gateway implemented; Worker 7 contracts only, 4 ACRs pending |
| 12 | AI Gateway/routing | Worker 8: 12 schemas + benchmark harness, NEEDS_REVIEW; no production router |
| 13 | Plugsky | UNVERIFIED — contradictions found 2026-09-19; docs/pricing pages exist (plugsky.com/docs); benchmark required |
| 14 | OpenRouter | Candidate specialist/frontier/fallback; no production integration yet |
| 15 | Direct providers/subscriptions | Subscriptions retained during build; not API capacity; entitlements not inventoried |
| 16 | Cloudflare | Proposed runtime; wrangler configs exist for worker-supervisor and command center; no verified deployments |
| 17 | Supabase/Neon (Postgres) | No selection recorded; stack has tested Postgres event-store backend (fake-verified only) |
| 18 | Next.js | Proposed; zero repo evidence |
| 19 | Tailwind/shadcn | Proposed; zero repo evidence |
| 20 | n8n | Proposed; no canonical decision, zero repo evidence |
| 21 | Stripe Connect | Proposed; no payment design located |
| 22 | Event Store + envelope | Implemented: append-only, hash-chained, JSONL + Postgres backends |
| 23 | Telemetry normalization | Implemented for GitHub + worker packets; Cloudflare/model-usage pending |
| 24 | Cost Ledger | Implemented: 5-state truth ladder incl. FACTORY_CREDIT_REPORTED; invoice reconciliation pending real invoices |
| 25 | Topology projection | Implemented; realtime transport (SSE) proven in Test 5, not yet selected for stack |
| 26 | Nexus / living world | Test 5 direction ACCEPTED; Worker 13 command center MERGE CANDIDATE — NEEDS CONTROL TOWER REVIEW; live deploy unverified |
| 27 | Devil Up AI + resources | Business-architecture statement only |

### Key corrections to prior records

1. Infisical project holding the GitHub App material is "Agency GitHub Token Broker", not "Agency Build Stack" as previously recorded.
2. The vault environment slug is `prod` (display name "Production").
3. The machine identity's Universal Auth is configured and was live-verified on 2026-09-22; the earlier "auth not yet configured" status is stale.
4. The GitHub App holds `workflows:write` (elevated-risk) and no `administration`; merge gating currently rests on process and Agency policy, not verified GitHub branch protection (unreadable with current scope).
5. The GitHub Token Broker is no longer a proposal: it is implemented and passed a live end-to-end verification (Infisical → app JWT → narrowed installation token → live GitHub read) on 2026-09-22.

### Open gaps (tracked in repo guide)

G-1 Agency Build Stack repo is local-only (needs GitHub repo creation). G-2 identity narrowing unverified. G-3 branch protection unverified. G-4 GitHub App webhook still disabled (event store now exists). G-5 Postgres vendor unselected. G-6 Plugsky benchmark not run. G-7 this Drive update requires manual paste.
