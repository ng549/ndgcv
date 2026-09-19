# Nexus Build Pool Benchmark

This harness compares exact Plugsky and OpenRouter routes without hard-coding either provider into application logic. It records raw attempts as JSONL and never declares a winner automatically.

## Workload

`tasks.json` covers schema extraction, defect repair, test generation, architecture, security review, structured tool planning, and repository-context reasoning. Every task has deterministic assertions or a named human rubric. For a decision, compare matched capability tiers and disclose exact provider, plan, route/model, parameters, date, region, and concurrency.

Metrics:

- completion quality and deterministic assertion pass rate;
- first-pass success and retry count;
- time to first token when streaming is enabled and total latency;
- successful responses / attempted responses;
- effective cost per successful task;
- rate-limit, timeout, transport and provider errors;
- concurrency achieved and sustained route availability.

Fixed subscription fees must be allocated using an explicit period and task-volume denominator. Plugsky cost stays `UNAVAILABLE` until its controlling credits/overage terms and an invoice are known. OpenRouter token cost must use the dated price book or provider-reported cost and be reconciled to billing. Estimated and reconciled cost may not be merged.

## Run

```bash
node benchmark/run.mjs --validate
PLUGSKY_MODEL=exact-route OPENROUTER_MODEL=exact-route node benchmark/run.mjs --provider all --concurrency 1
```

Required secrets are `PLUGSKY_API_KEY` and `OPENROUTER_API_KEY`. Optional base URL overrides are `PLUGSKY_BASE_URL` and `OPENROUTER_BASE_URL`. The script refuses a live run without the relevant key. It writes no secret values and redacts authorization-like output fields.

Run at concurrency 1, 5, 10 and a plan-permitted higher level; then perform a separate sustained soak. A production decision requires enough repetitions to report a confidence interval, not a single successful request.
