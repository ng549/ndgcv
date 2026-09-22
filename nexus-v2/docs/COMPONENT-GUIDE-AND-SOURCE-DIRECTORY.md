# The Agency Build Stack — Component Guide and Source Directory

Version 1.0 · Recorded 2026-09-22 · Reconciled against NEXUS-V2-CANONICAL.json v0.9 (sha256 `5c2dcc49…865c59`, branch `nexus-v2`, tip `23486da`)

Authority: the canonical overrides this guide where they conflict; file an ACR rather than editing either silently. Golden Rule applies throughout: statuses below cite evidence or say UNKNOWN / NOT LOCATED.

**Repository key**

- `ndgcv` = github.com/ng549/ndgcv (branch shown per entry)
- `abs` = the Agency Build Stack repo, currently **local-only** at `agency-build-stack/` on the Factory build machine, tip commit `a6ffdc1`. It has no GitHub remote yet (the GitHub App installation covers only `ng549/ndgcv`, and repo creation needs account-level rights). Path references are exact and verified at that commit; publishing the repo is an open gap (see G-1).

---

## Architecture diagram

```
                         ┌────────────────────────────────────────────┐
                         │  NEXUS (client portal / command & control) │
                         │  living-world view = projection, not truth │
                         └───────────────┬────────────────────────────┘
                                         │ reads projections / sends approved commands
   ┌─────────────────────────────────────┼─────────────────────────────────────┐
   │                        THE AGENCY BUILD STACK (Agency-owned truth)        │
   │                                                                          │
   │  Work Packet ──► Identity & Policy ──► Credential Broker ──► Infisical   │
   │  Service           (deny-by-default)      (references only)   (vault)    │
   │       │                                    │                              │
   │       ▼                                    ▼                              │
   │  ExecutionProvider ◄── scoped tokens ◄── GitHub Token Broker             │
   │  interface               (1h, repo+permission narrowed)                  │
   │       │                                                                   │
   │       ▼                                                                   │
   │  ┌──────────┐   events    ┌────────────────┐   folds    ┌──────────────┐ │
   │  │ Factory/ │ ──────────► │ Event Store    │ ─────────► │ Topology     │ │
   │  │ Droid    │             │ (append-only,  │            │ projection   │ │
   │  │ (1st     │   usage     │  hash-chained) │            │ + realtime   │ │
   │  │ provider)│ ──────────► └───────┬────────┘            └──────────────┘ │
   │  └──────────┘                     │                                       │
   │       │                           ▼                                       │
   │       ▼                     Cost Ledger (5-state truth ladder)            │
   │  Integration/MCP Gateway ──► external tools (policy-gated)               │
   └──────────────────────────────────────────────────────────────────────────┘
        │                    │                       │
        ▼                    ▼                       ▼
   GitHub (source truth)  Cloudflare (proposed     Model routes: Plugsky /
   branches, PRs, CI       runtime, unselected)    OpenRouter / direct APIs
```

## Worked example (target flow; every step exists in code unless marked otherwise)

1. **Approved request.** Nicolas approves a scope in the command center. A Work Packet is created: `abs contracts/work-packet.contract.json`, `src/packets/work-packet.mjs` — scope and acceptance criteria are mandatory; every transition carries an actor.
2. **Policy check.** Identity & Policy Service authorizes the launch (`abs src/identity/policy.mjs`); membership and role come from the Member Registry (`abs src/identity/registry.mjs`). Deny-by-default; the decision is an audited event.
3. **Execution.** The Work Packet is handed to the ExecutionProvider interface; the Factory adapter spawns `droid exec` (`abs src/providers/factory/factory-adapter.mjs`, live-verified 2026-09-22).
4. **Temporary credentials.** The GitHub Token Broker resolves `APP_PRIVATE_KEY` by reference from Infisical and mints a 1-hour installation token narrowed to the target repo and permissions (`abs src/github/token-broker.mjs`). The worker never sees the root key.
5. **Code / PR / CI.** The worker commits on its branch, pushes, opens a PR; GitHub Actions run. `contents:write`, `pull_requests:write`, `actions:read` are the live-verified app permissions.
6. **Acceptance evidence.** Tests and review verdicts attach to the packet; COMPLETE requires the canonical `complete_requires` list, not self-report.
7. **Events and cost.** Normalizers translate GitHub/webhook and worker signals into Agency events (`abs src/events/normalize/`); the append-only hash-chained Event Store keeps them; Factory usage lands in the Cost Ledger as `FACTORY_CREDIT_REPORTED` — not dollars — until invoice reconciliation (`abs src/cost/`).

---

## Reconciliation register (discrepancies found while building this guide)

| # | Topic | Canonical/prompt says | Verified actual (2026-09-22) | Disposition |
|---|-------|-----------------------|------------------------------|-------------|
| D-1 | Infisical project | "Agency Build Stack" | Secret lives in project **"Agency GitHub Token Broker"** (live API listing) | Canonical annotated, not overwritten |
| D-2 | Vault environment | "Production" | Display name Production; API slug is **`prod`** | Recorded; `environmentMap` encodes it in code |
| D-3 | Vault entries | 3 names listed | 4 present: `APP_PRIVATE_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`. Broker reads `APP_PRIVATE_KEY` | Recorded |
| D-4 | Machine identity status | `CREATED_AUTH_NOT_YET_CONFIGURED` | Universal Auth **configured and live-verified** (login + secret read) | Canonical status updated with evidence |
| D-5 | Identity narrowing | "Viewer, narrow later" | Read at target path verified; **deny-scope beyond the path NOT verified**; TTL/lockout settings never read back | Open gap G-2 |
| D-6 | App permissions | "intent: code+PR writes, CI visibility; workflows elevated-risk" | Live read-back: `contents:write`, `pull_requests:write`, `actions:read`, `checks:read`, `statuses:read`, `metadata:read`, **`workflows:write` present**, no `administration` | Recorded; workflow gating must be Agency-policy-side |
| D-7 | Merge gating | "no autonomous merge authority" | Nothing at GitHub-permission level blocks PR merge (`contents:write` suffices); branch-protection state on `main`/`nexus-v2` is **UNKNOWN** (403 without admin scope) | Open gap G-3 |
| D-8 | Token broker | described as target | **Implemented and live-verified** end-to-end | Canonical step_1 updated |
| D-9 | Worker 9 canonical pin | — | Pins canonical 0.5; current is 0.9 | Stale pin flagged |
| D-10 | GitHub App webhook | `disabled_pending_event_store` | Event Store now exists (`abs`); webhook still disabled | Unblocked, action pending |

## Open gaps

- **G-1** `abs` repo is local-only; create `ng549/agency-build-stack` (account-level action) and push.
- **G-2** Machine identity narrowing (Production + `/Github/agency-build-worker` only) not verified; Universal Auth TTL/lockout values not read back.
- **G-3** Branch protection on `main` / `nexus-v2` unreadable with current app scope; merge gating currently rests on process, not verified GitHub enforcement.
- **G-4** GitHub App webhook still disabled; event store now exists to receive it.
- **G-5** No live Postgres selected/provisioned (Supabase vs Neon undecided); `PostgresEventStore` is tested against a recorded fake only.
- **G-6** Plugsky remains UNVERIFIED per canonical Worker 8 directive; benchmark harness exists but no runs recorded.
- **G-7** Drive canonical document: no write access from the build environment (read also returned 401). The Drive-ready addition accompanies this guide.

---

## Components

### 1. Factory/Droid — execution environment

- **Purpose:** Conversational development and agent execution: coding, testing, review, browser validation, execution telemetry.
- **Role:** First approved **ExecutionProvider**. Replaceable.
- **Inputs:** Work Packets via the ExecutionProvider interface. **Outputs:** code, test results, usage telemetry (`usage.factory_credits`).
- **Owns:** session execution. **Does not own:** Agency secrets, durable Work Packet truth, cost ledger, cross-provider event history, acceptance semantics, architecture authority, merge authority.
- **Status:** `APPROVED_FOR_BUILD_STACK_INTEGRATION` (canonical `build_stack_evaluation`; six gates passed; **no Test #7**). Adapter live-verified 2026-09-22 (micro-launch, exit 0).
- **Product:** selected (as provider #1). **Docs:** https://docs.factory.ai · **Console:** app.factory.ai
- **Repo:** `abs src/providers/factory/factory-adapter.mjs` (`f36fbf8`), `abs docs/VERIFICATION-factory-launch.md`; evaluation records `ndgcv` branches `eval/factory-build-stack-test-02..05`, `integration/factory-test-06-command-center`.
- **Drive:** evaluation summaries live in the Nexus V2 folder (`137sMNK6jYVnMuZca5UB6h1Z06Dc_wjYn`). **Gaps:** none for the launch seam; pause/stop and richer telemetry collection are adapter roadmap.

### 2. ExecutionProvider interface — replaceable execution contract

- **Purpose:** Agency-owned contract: launch, monitor, pause, stop, collect results from any execution engine.
- **Role:** Seams Factory in without coupling Work Packets or Nexus to Factory.
- **Inputs:** Work Packet + execution options. **Outputs:** execution handle, status (UNKNOWN is first-class), usage records.
- **Owns:** the contract. **Does not own:** provider internals.
- **Status:** Implemented (`abs src/providers/execution-provider.mjs`, Factory adapter, in-memory reference provider `src/providers/memory/memory-provider.mjs`); launch seam live-verified; honest status mapping (garbage→UNKNOWN; COMPLETE carries self-report caveat).
- **Repo:** `abs src/providers/` (`5852437`, `f36fbf8`). **Docs:** internal. **Gaps:** pause/stop implemented for the seam, exercised only against the memory provider.

### 3. GitHub — permanent software source truth

- **Purpose:** Source code, branches, commits, PRs, reviews, CI records; portability outside any Factory session.
- **Role:** Source truth. Agency merges remain gated.
- **Status:** In force. Integration branch `nexus-v2`; concurrent worker branches preserved; production `main` (CV site) untouched by this task.
- **Docs:** https://docs.github.com · **Console:** github.com/ng549/ndgcv
- **Repo evidence:** this repository; canonical at `nexus-v2/NEXUS-V2-CANONICAL.json` v0.9.
- **Gaps:** G-3 (branch protection unreadable with current scopes).

### 4. The Agency Build Worker GitHub App — machine execution identity

- **Purpose:** Selective repository access for authorized automated work; reusable across future Agency/client repos, not tied to ndgcv.
- **Status:** **Live-verified 2026-09-22** (`abs scripts/live-verify-app-permissions.mjs`). Recorded by GitHub: owner `ng549`, app 5025971, installation 163609141, `repository_selection: selected`, repositories = **`ng549/ndgcv` only**. Permissions: `contents:write`, `pull_requests:write`, `actions:read`, `checks:read`, `statuses:read`, `metadata:read`, **`workflows:write`**. No `administration` (confirmed indirectly: branch-protection reads are 403).
- **Boundary note:** `workflows:write` IS present (D-6) — workflow edits are possible; gate them in Agency policy. Merge is not blocked by app permissions (D-7).
- **Console:** github.com/settings/apps (app) and github.com/settings/installations (installation). **Docs:** https://docs.github.com/en/apps
- **Gaps:** G-3, G-4.

### 5. Infisical — initial Agency secrets vault

- **Purpose:** Root secrets and machine credentials outside prompts, source code, and Droid environments.
- **Status:** **Live-verified 2026-09-22** (login + secret read from stack code). Actual layout (D-1/D-2/D-3): org "The Agency", project **"Agency GitHub Token Broker"**, environment slug **`prod`** (display "Production"), folder `/Github/agency-build-worker`, entries `APP_PRIVATE_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`. No real credentials in Development, per canonical (`development_real_credentials: false`) — not independently re-verified today.
- **Product:** selected (initial vault). **Docs:** https://infisical.com/docs · **Console:** us.infisical.com → org "The Agency"
- **Repo:** `abs src/credentials/infisical.mjs` (`fa9b665`, slug map in `e682e1e`). **Gaps:** G-2.

### 6. agency-github-token-broker — Infisical machine identity

- **Purpose:** Lets the broker authenticate to Infisical and read only the GitHub App configuration.
- **Status:** Universal Auth **configured and live-verified** (2026-09-22); canonical's `CREATED_AUTH_NOT_YET_CONFIGURED` is stale (D-4). Role: Viewer. Proposed narrowing (Production + target folder) and the exact Universal Auth TTL/lockout values (900s TTL, 3600s max, lockout 3/5min/30s) were **not read back — UNKNOWN** (D-5).
- **Console:** Infisical → project → Access Control → Machine Identities. **Gaps:** G-2 (verify narrowing; read back auth settings; record rotation/revocation procedure).

### 7. Agency GitHub Token Broker — temporary GitHub access

- **Purpose:** Checks authorized execution context, resolves app config from Infisical, mints short-lived installation tokens. Droid/workers get temporary scoped access, never the root private key.
- **Status:** **Implemented and live-verified end-to-end 2026-09-22**: RS256 app JWT → installation token narrowed to `ndgcv` + `contents:write` → live `api.github.com` read succeeded. Both mint outcomes audited without token material. Fail-closed typed errors.
- **Repo:** `abs src/github/token-broker.mjs` (`fa9b665`, `e682e1e`), probe `scripts/live-verify-credentials.mjs`, evidence `docs/VERIFICATION-credential-chain.md`.
- **Docs:** https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app
- **Gaps:** bootstrap credential storage/rotation/recovery procedure not yet documented; token cache is in-process only.

### 8. Agency Identity & Policy Service — authority and permitted actions

- **Purpose:** Establishes who/what is acting and what they may do per client/project/environment/worker/execution. Vendor permissions never replace Agency policy.
- **Status:** Implemented (`abs src/identity/policy.mjs`: deny-by-default, audited decisions, `namespace.*` grants, principal-lockout guard; `abs src/identity/registry.mjs`: append-only member registry, role catalog founder/admin/builder/reviewer/viewer + agent worker/ci, FOUNDER_LOCKOUT guard, policy derived from live membership so suspension revokes immediately). 87/87 tests green at `a6ffdc1`.
- **Repo:** `abs src/identity/`, `abs docs/MEMBERSHIP.md`. **Gaps:** no external IdP/SSO; human sign-in for the command center remains Cloudflare Access per Worker 13 (unverified live).

### 9. Work Packet service — durable work instructions and state

- **Purpose:** Approved objective, scope, dependencies, execution context, budget, constraints, acceptance criteria, evidence. Continuation across sessions and providers; Factory session state is never the sole record.
- **Status:** Implemented in the stack (`abs contracts/work-packet.contract.json`, `src/packets/work-packet.mjs`: scope/acceptance mandatory, attribution-mandatory transitions, terminal COMPLETE). Worker 9's Cloudflare+D1 supervisor (`ndgcv@nexus-v2-p1-09-build-orchestration: nexus-v2/worker-supervisor/`, `72389be`) is `IMPLEMENTED_UNVERIFIED`, pins stale canonical 0.5 (D-9).
- **Gaps:** stack service and Worker 9 supervisor are not yet reconciled to one contract (Control Tower scope).

### 10. Credential Broker — general credential resolution

- **Purpose:** Resolve the correct Agency/client credential per authorized action: environment separation, least privilege, BYOK, expiry, revocation, audit. Never silently falls back to Agency credentials for a client action.
- **Status:** v0 implemented and live-verified for the GitHub chain (`abs src/credentials/broker.mjs` — references only, scope validation, audit-first). Factory Test 4 (`ndgcv@eval/factory-build-stack-test-04: agency-build-stack/evaluations/factory-test-04/`, `8d8915f`) was a **disposable prototype with fake credentials** — its ACCEPTED verdict is design evidence, not production verification.
- **Gaps:** BYOK/client-credential paths designed, not exercised; rotation automation absent.

### 11. Integration/MCP Gateway — governed access to external tools

- **Purpose:** Controlled tool operations for workers: worker requests → policy authorizes → gateway calls vendor → model receives result. An MCP connector alone supplies no authorization or isolation.
- **Status:** Stack gateway implemented (`abs src/gateway/gateway.mjs`, `d51cf4e`): policy-gated dispatch, audited. Worker 7 (`ndgcv@nexus-v2-p1-07-integrations: nexus-v2/workstreams/07-integrations/`, `9d4015c`) delivered architecture/contracts only, self-declared "not production verified", 4 ACRs pending.
- **Gaps:** no real vendor connectors behind the gateway yet; Worker 7 contracts unreconciled with stack gateway.

### 12. AI Gateway and routing — model/provider selection

- **Purpose:** Route model requests by capability, quality, effective cost, availability, latency, privacy/commercial constraints, fallback health; meter per client/project/packet/execution.
- **Status:** Worker 8 (`ndgcv@nexus-v2-p1-08-ai-gateway: nexus-v2/ai-gateway/`, `4dc6825`): 12 schemas + benchmark harness; handoff `NEEDS_REVIEW`; **no production router code**. Canonical: aggregator-first; apps call the Nexus AI Gateway rather than providers directly where practical.
- **Docs:** Worker 8 `AI-GATEWAY-DESIGN-CANONICAL.json`. **Gaps:** router implementation; production metering.

### 13. Plugsky — candidate high-volume model capacity

- **Purpose:** Candidate flat-rate capacity for routine/high-volume autonomous work.
- **Status:** **UNVERIFIED — not approved** (canonical `worker8_priority_directive` stands). Worker 8 record `PLUGSKY-VERIFICATION-2026-09-19.md`: PARTIALLY VERIFIED / NOT APPROVED (flat-rate vs Terms/SLA contradictions; 4/36 tested models broken). Re-checked 2026-09-22: official site and docs exist — https://plugsky.com/docs (A–Z reference, `/v1` API), pricing article lists flat tiers $20/$60/$120 "unlimited". Marketing claims are not verification; the benchmark-vs-OpenRouter requirement is unchanged.
- **Gaps:** G-6 (run `nexus-v2/ai-gateway/benchmark/` harness; obtain commercial terms in writing; then decide).

### 14. OpenRouter — candidate multi-model access and fallback

- **Purpose:** Specialist/frontier model pool and fallback capacity; compare effective cost/reliability against other qualified routes.
- **Status:** Candidate (canonical `ai_stack.build_phase_strategy.openrouter`: "immediate production-capable gateway candidate", use selectively). Worker 8 benchmark harness supports it; no production integration recorded.
- **Docs:** https://openrouter.ai/docs · **Console:** openrouter.ai
- **Gaps:** account/BYOK decision; benchmark run; revenue-bullpen approval before any customer-facing use (canonical `revenue_rule`).

### 15. Direct model providers and interactive subscriptions

- **Purpose:** Direct APIs where justified; ChatGPT/Claude/Grok subscriptions support human-led development.
- **Status:** Canonical: keep subscriptions during the accelerated build; subscriptions are **not** API capacity and supply no autonomous worker credentials. Actual account entitlements: NOT LOCATED in records.
- **Gaps:** entitlement inventory; development-spend reduction ($≈500/month target) awaits workload evidence.

### 16. Cloudflare — proposed application and infrastructure runtime

- **Purpose:** Proposed hosting/runtime: Workers (server-side), Pages where applicable; Workers for Platforms is a scale candidate only.
- **Status:** Proposed, partially scaffolded. Evidence: root `wrangler.jsonc` (the CV site, all branches — out of scope here), `nexus-v2/worker-supervisor/wrangler.jsonc` (p1-09), `nexus-v2/operator-command-center/wrangler.jsonc` (p1-13, test-06). **No verified deployments of stack components; no `_headers`/`_redirects` found.**
- **Docs:** https://developers.cloudflare.com · **Console:** dash.cloudflare.com (account details NOT LOCATED in records).
- **Gaps:** account/zone inventory; first real deploy + verification.

### 17. Supabase or Neon/Postgres — proposed durable relational data layer

- **Purpose:** Structured operational/financial records under Agency control (packets, events, cost ledger). Storage supports services; it does not replace their logic.
- **Status:** **No selection recorded** — treat Supabase and Neon as alternatives. Stack readiness: `abs src/events/postgres-store.mjs` implements the event store on Postgres semantics (`SCHEMA_SQL` export, injectable query seam), tested against a recorded fake only (G-5).
- **Docs:** https://supabase.com/docs · https://neon.com/docs
- **Gaps:** selection decision, provisioning, migrations, live chain verification.

### 18. Next.js — proposed application framework

- **Purpose:** Application structure/routing/rendering where selected.
- **Status:** Proposed. **No `next.config.*`, no `next` dependency anywhere in surveyed branches.** Current worker UIs are Cloudflare-Worker-served HTML/JS.
- **Docs:** https://nextjs.org/docs · **Gaps:** selection vs. current Workers approach; runtime compatibility with chosen deploy target.

### 19. Tailwind CSS and shadcn/ui — proposed interface tools

- **Purpose:** Styling utilities + adaptable components; not a design system, accessibility standard, or product behavior.
- **Status:** Proposed. **No dependencies found in any surveyed branch.**
- **Docs:** https://tailwindcss.com/docs · https://ui.shadcn.com · **Gaps:** design records not located.

### 20. n8n — proposed workflow automation

- **Purpose:** Repeatable integration/ops workflows, distinct from AI execution orchestration and Work Packet truth.
- **Status:** Proposed. No canonical decision located; **no n8n workflow files in any surveyed branch.**
- **Docs:** https://docs.n8n.io · **Gaps:** adopt/reject decision; licensing review (Sustainable Use License) before commercial embedding.

### 21. Stripe Connect — proposed payment infrastructure

- **Purpose:** Platform payment flows with connected accounts, if the business model requires them. Not the Agency Cost Ledger; not presumed necessary for ordinary subscription billing.
- **Status:** Proposed. **No payment design, code, or canonical decision located.**
- **Docs:** https://docs.stripe.com/connect · **Gaps:** payment/business design gate before any adoption.

### 22. Agency Event Store and normalized event envelope — durable activity history

- **Purpose:** Consistent IDs, timestamps, types, provenance, correlation across vendors; append-only storage for replay, audit, projections. No single vendor owns history.
- **Status:** Implemented (`abs contracts/event.contract.json`; `src/events/event-store.mjs` JSONL + `src/events/postgres-store.mjs` share `src/events/chain.mjs` hash-chain primitives; `verifyChain` detects tamper/reorder/deletion). Lineage: Test 2 (`ndgcv@eval/factory-build-stack-test-02: …/factory-test-02/src/eventStore.ts`) and Test 5 (`eval/factory-build-stack-test-05: …/src/core/eventStore.ts`) prototypes.
- **Gaps:** production backend selection (G-5); GitHub webhook still disabled (G-4).

### 23. Telemetry normalization — translating vendor signals

- **Purpose:** Adapters translate execution, GitHub/CI, deployment, and model-usage signals into Agency events with provenance; missing/delayed telemetry must never appear as confirmed success.
- **Status:** Implemented for two sources (`abs src/events/normalize/github.mjs`: push/PR/workflow_run/installation, unhandled types carry payload **keys only**; `src/events/normalize/worker-packet.mjs`: stale-heartbeat collapse to UNKNOWN with evidence, `3d9f301`). Test 5 prototype adapters (factory/github/cloudflare/openrouter) at `eval/factory-build-stack-test-05: …/src/adapters/`.
- **Gaps:** Cloudflare + model-usage normalizers not yet in the stack; live webhook ingestion (G-4).

### 24. Agency Cost Ledger and reconciliation — financial truth

- **Purpose:** Usage/cost by org, client, project, packet, worker, execution, provider, model. Truth states: ESTIMATED → PROVIDER_REPORTED / FACTORY_CREDIT_REPORTED → INVOICE_RECONCILED, with ADJUSTED superseding while preserving history.
- **Status:** Implemented (`abs contracts/cost-entry.contract.json`; `src/cost/cost-ledger.mjs`: 5-state ladder, ADJUSTED supersedes, UNKNOWN-safe margin; `src/cost/factory-usage.mjs`: maps live `droid exec` usage to FACTORY_CREDIT_REPORTED with dollars/provider null, `f36fbf8`). Test 2 prototype: append-only + reconciliation tests (`eval/factory-build-stack-test-02: …/src/costStore.ts`, tests `02`/`03`/`06`).
- **Gaps:** invoice reconciliation procedure (needs first real invoices); retail/margin metering awaits AI Gateway.

### 25. Topology projection and realtime delivery — current operational state

- **Purpose:** Fold event history into the current view (projects, workers, executions, tools, tests, deployments, dependencies, costs); realtime pushes state changes to the UI. The visualization is a view, not the truth store.
- **Status:** Projection implemented (`abs src/topology/projection.mjs`, `af1eb2d`: event-folded node/edge graph, telemetry-stale vs projection-stale channels). Realtime transport: SSE proven in the Test 5 prototype (`eval/factory-build-stack-test-05: …/src/server.ts`); **no transport selected for the stack yet.**
- **Gaps:** transport selection; projection↔UI contract.

### 26. NEXUS and the living-world visualization — user-facing control

- **Purpose:** Client portal, workspace, Agency command/control. Living world shows actual activity (NEXUS HQ, production resources, GitHub, Cloudflare, workers, packets, deployments, costs); animation must correspond to telemetry.
- **Status:** Direction proven, not production-ready: Test 5 RTS-style world (`eval/factory-build-stack-test-05`, 111 tests, four ACCEPTED reviews, evidence PNGs). Worker 13 command center (`ndgcv@integration/factory-test-06-command-center: nexus-v2/operator-command-center/`, `925daa9`): 5 independent reviews ACCEPTED, CI run 35655128191 green; verdict MERGE CANDIDATE — NEEDS CONTROL TOWER REVIEW; live deploy on nicolasgoureau.com unverified.
- **Gaps:** Control Tower reconciliation; first verified deployment.

### 27. Devil Up AI and other production resources — delivery capacity

- **Purpose:** Internal Agency production resource alongside AI agents, contractors, specialists, vendors; work assigned by capability, availability, quality, deadline, cost, margin. Not the control plane.
- **Status:** Business-architecture statement only (canonical `global_architecture.devil_up`). No implementation artifacts expected or found.
- **Gaps:** resource-allocation model when client production begins.

---

## Save verification

- This guide: committed on branch `docs/component-guide-2026-09-22` (from `origin/nexus-v2` tip `23486da`) — see commit hash in the task report; read-back verification recorded there.
- Canonical: `nexus-v2/NEXUS-V2-CANONICAL.json` gains `global_architecture.component_guide` (structured component/status/source refs) and a `reconciliation_2026_09_22` record; step_1 status corrected with evidence. Prior decisions preserved verbatim.
- Drive: NOT updated — no write access (read also 401). The exact Drive-ready addition is `nexus-v2/docs/DRIVE-READY-COMPONENT-GUIDE.md` in the same commit.
