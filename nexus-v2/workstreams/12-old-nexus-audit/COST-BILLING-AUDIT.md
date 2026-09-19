# Cost / Billing Audit

Status: INSPECTED.

## V1 capabilities
- AI request usage logged to a Google Sheet Cost Ledger.
- Provider/model/input/output/tool calls/exact-vs-estimated/cost/actor/route/notes captured.
- daily/month/projection/total/provider summaries computed.
- provider reconciliation rows compare metered vs billed cost.
- historical scheduled reconciliation:
  - Google Cloud: commit `c072e790cc82412543a93b40cc9d7ab8f5aef54b`
  - xAI: commit `7e057999be40b6b10fddb338e675145ec8b53643`
  - Cloudflare: commit `3d8f1d4cef63f6fd17ce7bcc207b139ae4e3c328`
- Perplexity path explicitly treated as statement import when no public invoice API verified.

## Valuable concepts
- separate metered usage from billed provider truth;
- mark exact vs estimated;
- reconcile variance;
- project/operator attribution;
- fixed costs appear only when source connected;
- show recent records and provider breakdown.

## Problems
- JS `Number` and USD float arithmetic conflict with V2 money rule.
- Google Sheet is not an immutable normalized ledger.
- MHC sheet IDs/project assumptions are embedded in workflows.
- provider names/routes are hardcoded.
- tenant/project/currency/idempotency/source version fields do not meet V2 Control Tower Cost Event contract.
- V1 cost UI is not a billing/entitlement system.

## Worker 2 comparison
Available alternatives:
- Stripe Billing: mature billing/invoice/subscription provider.
- OpenMeter: Apache-2.0 usage metering, credits/entitlements.
- Lago: richer usage billing but AGPL/commercial considerations.
- Metronome/Stripe usage-based billing for complex cases.
- Langfuse for AI telemetry, but not a financial ledger.

## Recommendation
V1 cost concepts: **ADAPT**.
Sheet schema/workflows as core ledger: **REBUILD**.
Provider-specific scripts: **REFERENCE ONLY** for API quirks.
Worker 8 owns raw AI usage/cost facts; Worker 10 owns normalized ledger/billing/reconciliation.
For the under-8-week target, integrating Stripe + OpenMeter (or equivalent managed primitives) is likely safer/faster than salvaging the V1 Sheet ledger, subject to Worker 10 validation.
