# Nexus V2 Worker Supervisor — Worker 9

Status: **Implemented / Unverified**

Branch: `nexus-v2-p1-09-build-orchestration`

## Purpose

Remove Nicolas from the repeated consumer-chat "Go" loop by supervising bounded API/agent executions from persistent Work Packets.

## P0 vertical slice implemented

- Persistent Work Packet, execution, audit and cost-event schema.
- Dependency-aware `RUN ALL READY` and `RUN PHASE` eligibility.
- Commands: `RUN`, `CONTINUE`, `PAUSE`, `RESUME`, `STOP`, `RETRY`, `REASSIGN MODEL`, `ADJUST BUDGET`, `SEND TO REVIEW`.
- Canonical SHA freshness check before launch.
- Hard worker budget check.
- Qualified preferred/fallback model selection contract.
- File-scope conflict detection against other running workers.
- Stable execution idempotency key from worker + packet version + checkpoint.
- Persistent checkpoint pointer.
- Retry ceiling with transition to a blocker after repeated failure.
- Queue-driven continuation: unfinished valid work returns to `READY` and requeues.
- Worker completion is never authoritative: verified acceptance moves only to `NEEDS_REVIEW`; independent approval is required for `COMPLETE`.
- Audit events for launch, finish, failure and commands.
- Cloudflare Worker/D1/Queue runtime scaffold compatible with Worker 13's current Cloudflare direction.
- Provider-neutral Gateway launch payload compatible with Worker 8's policy boundary.

## Runtime path

```text
Operator command
  -> persisted Work Packet
  -> dependency/canonical/budget/write-conflict guards
  -> qualified model selection
  -> acquire idempotent execution record + lease
  -> Nexus AI Gateway /v1/worker-executions
  -> persist checkpoint/result
  -> if blocker: BLOCKED
  -> if retryable failure: FAILED then bounded requeue
  -> if work remains: READY then auto-requeue
  -> if acceptance + verification claimed: NEEDS_REVIEW
  -> independent review
  -> COMPLETE only after approval
```

## Reuse decision

The contract is intentionally runtime-portable. For this P0 branch, Cloudflare Queues + D1 is the smallest implementation aligned with Worker 13's Cloudflare command-center work. The Phase Two durable runtime should be selected after Control Tower reconciliation.

Evaluated candidates:

- Cloudflare Workflows: close platform fit; durable multi-step execution, persisted state, retries and long waits.
- Temporal: mature MIT-licensed durable execution and recovery model.
- Hatchet: MIT-licensed durable tasks, queues, concurrency/rate controls and AI-agent orchestration.
- Restate: durable execution, stateful entities and exactly-once communication semantics; runtime license differs from SDKs and needs commercial review before adoption.

No external workflow engine is declared approved in this branch.

## Worker 8 contract

Worker 8 currently provides a design contract, not a deployed Gateway. This supervisor sends:

- request/idempotency ID
- worker ID
- capability
- preferred model
- remaining budget
- branch
- allowed files
- canonical/context refs
- acceptance criteria
- checkpoint SHA

The live Gateway URL/token remain deployment-time bindings. The supervisor must not bypass Worker 8 rights, privacy, BYOK, entitlement or route-policy gates.

## Worker 13 contract

Worker 13 currently recognizes the six base controls. `contracts/command-contract.json` adds the P0 extension required by the canonical:

- REASSIGN_MODEL
- ADJUST_BUDGET
- SEND_TO_REVIEW
- RUN_ALL_READY
- RUN_PHASE

Worker 13 owns UI/auth. Worker 9 owns supervisor semantics.

## Crash/restart recovery

Durable recovery comes from database state, not prior chat context:

1. Work Packet retains canonical refs, branch, scope, acceptance criteria, budget and checkpoint.
2. Each bounded execution has a stable idempotency key.
3. Successful checkpoints are persisted before continuation.
4. Duplicate execution IDs are rejected.
5. On restart, the next launch derives from the latest persisted packet/checkpoint.
6. Lease expiry is stored so a reconciliation process can identify abandoned RUNNING executions.

A production lease-reaper/reconciler is still required before claiming crash recovery is production-verified.

## Guardrails

- infinite continuation: bounded per-execution attempts + retry ceiling; future global continuation cap should also be policy-configured.
- runaway spend: hard worker budget checked before launch; Gateway must enforce per-request reservation/settlement.
- repeated failures: bounded retries then BLOCKED.
- duplicate jobs/commits: execution idempotency key; commit duplication still requires Git worker-side checkpoint discipline.
- concurrent writes: allowed-file overlap check across RUNNING packets.
- stale canonical: exact canonical SHA gate.
- false completion: external review gate.
- provider outage/quota: preferred/fallback route selection; Gateway remains authoritative.
- missing Gateway: fail clearly; do not silently route around policy.

## Verification

GitHub Actions workflow: `.github/workflows/worker9-supervisor.yml`

It runs:

- `npm test`
- `npm run check`

The first CI run for this branch completed successfully on 2026-09-19.

## Not yet verified

- no Cloudflare deployment was performed in this branch;
- no real D1/Queue bindings were provisioned;
- no live Worker 8 Gateway endpoint exists for end-to-end launch testing;
- no API worker was actually launched from this supervisor;
- cost-event settlement is schema-defined but requires Worker 8/10 live contract reconciliation;
- active execution cancellation is not yet wired to a live Gateway cancel endpoint;
- lease-reaper and heartbeat ingestion require the next integration slice;
- security/auth is owned by Worker 13 and was not duplicated here.

Therefore this branch is **Implemented / Unverified**, not Complete.
