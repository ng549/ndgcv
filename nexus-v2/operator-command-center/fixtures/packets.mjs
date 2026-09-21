// fixtures/packets.mjs — Worker C (Factory Test #6)
// FIXTURE-BASED; NOT PRODUCTION VERIFICATION.
// Builders for Worker 9 wire packets (snake_case), matching
// worker-supervisor/contracts/work-packet.schema.json (contract v1).
// All required schema fields are always present with plausible values.

const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();

export const MINUTE_MS = 60 * 1000;

/**
 * Base packet with every required schema field populated.
 * Defaults describe a READY, funded, dependency-free worker.
 */
export function base(overrides = {}) {
  return {
    worker_id: "W1",
    phase: "phase-1",
    module: "nexus-v2/operator-command-center",
    scope: "Operator command center",
    branch: "nexus-v2-p1-13-operator-command-center",
    allowed_files: ["nexus-v2/operator-command-center/src/**"],
    context_refs: ["nexus-v2/NEXUS-V2-CANONICAL.json"],
    acceptance_criteria: ["npm run check passes"],
    dependencies: [],
    preferred_model: "claude-sonnet-4.5",
    fallback_models: ["claude-opus-4.5"],
    budget_limit_micros: 5_000_000,
    budget_consumed_micros: 1_250_000,
    canonical_sha: "abc1234",
    state: "READY",
    checkpoint_sha: "def5678",
    heartbeat_at: null,
    retry_count: 0,
    max_retries: 3,
    blocker: null,
    review_state: "NOT_SENT",
    packet_version: 1,
    ...overrides
  };
}

export function readyPacket(overrides = {}) {
  return base({ state: "READY", ...overrides });
}

export function runningFreshPacket(overrides = {}) {
  return base({ state: "RUNNING", heartbeat_at: iso(0), ...overrides });
}

// 30 minutes old — beyond HEARTBEAT_STALE_MS (10 min), so it must collapse to UNKNOWN downstream.
export function runningStalePacket(overrides = {}) {
  return base({ state: "RUNNING", heartbeat_at: iso(30 * MINUTE_MS), ...overrides });
}

export function runningNoHeartbeatPacket(overrides = {}) {
  return base({ state: "RUNNING", heartbeat_at: null, ...overrides });
}

export function pausedPacket(overrides = {}) {
  return base({ state: "PAUSED", heartbeat_at: iso(2 * MINUTE_MS), ...overrides });
}

export function failedPacket(overrides = {}) {
  return base({
    state: "FAILED",
    retry_count: 1,
    heartbeat_at: iso(5 * MINUTE_MS),
    ...overrides
  });
}

export function blockedPacket(overrides = {}) {
  return base({
    state: "BLOCKED",
    retry_count: 3,
    blocker: { code: "REPEATED_FAILURE", message: "Gateway returned 500 three times" },
    ...overrides
  });
}

export function needsReviewPacket(overrides = {}) {
  return base({
    state: "NEEDS_REVIEW",
    review_state: "PENDING",
    heartbeat_at: iso(3 * MINUTE_MS),
    ...overrides
  });
}

export function completePacket(overrides = {}) {
  return base({
    state: "COMPLETE",
    review_state: "APPROVED",
    heartbeat_at: iso(60 * MINUTE_MS),
    ...overrides
  });
}

// consumed == limit: budget exhausted edge case.
export function zeroBudgetPacket(overrides = {}) {
  return base({
    budget_limit_micros: 2_000_000,
    budget_consumed_micros: 2_000_000,
    ...overrides
  });
}

// preferred_model explicitly null (schema allows string|null).
export function noModelPacket(overrides = {}) {
  return base({ preferred_model: null, fallback_models: [], ...overrides });
}
