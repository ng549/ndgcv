# Plugsky Verification Record — 2026-09-19

Status: **PARTIALLY VERIFIED / NOT APPROVED**  
Decision: Plugsky remains an `UNVERIFIED` Development Bullpen candidate. It is not approved for Revenue Bullpen traffic and is not established as cheaper, reliable, or suitable for Nexus autonomous workers.

## Evidence matrix

| Question | Current evidence | Status / consequence |
|---|---|---|
| Official API availability | Official docs publish an OpenAI-compatible `https://api.plugsky.com/v1` endpoint and chat completions. An unauthenticated `GET /v1/models` returned HTTP 200 and 36 entries on 2026-09-19. Most other documented API families are marked “coming soon.” | Chat surface **discovered and externally reachable**; authenticated generation is not tested. Do not infer production availability. |
| Pricing | The public pricing page advertises monthly launch prices of $5.60/$14/$42/$84 and yearly equivalents of $4/$10/$30/$60 for Hobby/Starter/Builder/Scale. | **UNVERIFIED as billable economics.** No invoice, order form, or account checkout was tested. |
| Flat rate / fair use | Docs and pricing say unlimited use subject to fair-use RPM/concurrency and no per-token/request/overage fees. The Terms instead define monthly usage credits and per-token overages. | Material contradiction. Do not call the service flat-rate or calculate savings until Plugsky supplies a controlling plan schedule/order form. |
| Automation restrictions | Product material supports API, CLI “full-auto,” agents, tools, batch-oriented workflows, and programmatic use. Terms prohibit abuse, spam/mass marketing, circumvention, credential sharing, and harmful/illegal use. | Routine build automation **appears intended**, but exact autonomous-worker use must be confirmed against the controlling plan/AUP. |
| Rate and concurrency limits | Docs list Free 60 RPM/5 concurrent, Starter 60/10, Builder 300/50, Scale 1000/200. | **Documented, not load-tested.** Bind limits to a dated plan record; never assume plan names or limits remain stable. |
| Reliability | Public `/api/status` reported operational. `/api/status/incidents` exposed two resolved historical incidents. `/api/status/metrics` returned empty arrays. `/api/health/models` reported `ok:false`: 4 of 36 models were broken, while several nominally healthy models showed roughly 44–82 second health-check latency. | **Not reliability verified.** The aggregate green status is insufficient, and route health indicates material concerns. A sustained authenticated soak and concurrency test is required. |
| SLA | Docs describe 99.9% for Builder/Scale, while Terms list 99.0% Starter, 99.5% Builder, 99.9% Growth and Scale. Terms also disclaim uninterrupted/error-free service. | Contradictory. Only a signed plan/order form can establish a Nexus SLA. |
| Privacy / data | Privacy policy says prompts/completions are not used for training or sold, request bodies have zero-day retention, usage metadata is kept 13 months, and upstream retention is contractually prohibited. It describes UAE/EU/US/KSA processing and enterprise region pinning by DPA. | **Documented vendor claim, not independently audited.** Obtain DPA, subprocessor list, security evidence, region commitment, and model/upstream exceptions before sensitive traffic. |
| Customer-facing commercial use | Terms say users own content and third-party model terms still apply. Public white-label material markets agency/vertical-SaaS use. | **CONDITIONAL / legal review required.** Each plan + model + use case needs its own rights record. |
| Raw API resale / white label | Terms prohibit resale or sublicensing except where expressly permitted by an Enterprise agreement. The white-label page describes wholesale resale offerings. | **Not permitted by self-serve evidence.** Require executed Enterprise terms/order form explicitly covering the intended resale and model routes. |
| Model identity / metadata | `/v1/models` returned provider/upstream and family/version fields that were not consistently aligned in sampled records. | Treat discovery metadata as untrusted observations. Pin an exact route and verify the actual served model where the provider exposes evidence. |

## Official sources reviewed

- Documentation: https://plugsky.com/docs
- Pricing: https://plugsky.com/pricing/
- Terms: https://plugsky.com/legal/terms
- Privacy: https://plugsky.com/legal/privacy
- White-label product page: https://plugsky.com/articles/solutions/white-label-ai-api
- Live public endpoints: `https://api.plugsky.com/v1/models`, `https://plugsky.com/api/status`, `/api/status/incidents`, `/api/status/metrics`, `/api/health/models`, and `/health`

Sources were reviewed and probes were run on 2026-09-19 UTC. Public pages and self-reported health are evidence of vendor statements, not independent assurance.

## Required closure evidence

1. Signed or account-specific plan schedule resolving credits, overages, discounts, fair use, RPM, concurrency, throttling, suspension, and SLA.
2. Written confirmation that Nexus autonomous build workers are allowed at the expected parallelism.
3. Enterprise agreement/order form explicitly addressing embedded customer apps, raw API resale, white label, downstream terms, and each intended model family.
4. DPA, subprocessors, deletion/retention mechanics, region commitment, incident notice, and security assurance.
5. Authenticated benchmark and at least a 7-day route-level soak, including concurrency, throttling, failures, retries, and served-model identity.
6. Reconciled invoice evidence before any Plugsky effective-cost or savings claim.

## Benchmark state

The representative harness is in `benchmark/`. No authenticated completion benchmark was run because `PLUGSKY_API_KEY` and `OPENROUTER_API_KEY` were absent. The harness configuration and dry-run validation were tested locally. Results must therefore remain `NOT_RUN`, not zero, failed, or inferred.
