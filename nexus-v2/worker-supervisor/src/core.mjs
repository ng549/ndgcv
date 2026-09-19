export const STATES = Object.freeze([
  "READY","RUNNING","PAUSED","STOPPED","WAITING_ON_DEPENDENCY","BLOCKED",
  "FAILED","NEEDS_REVIEW","COMPLETE"
]);

export const COMMANDS = Object.freeze([
  "RUN","CONTINUE","PAUSE","RESUME","STOP","RETRY",
  "REASSIGN_MODEL","ADJUST_BUDGET","SEND_TO_REVIEW"
]);

export class SupervisorError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "SupervisorError";
    this.code = code;
    this.detail = detail;
  }
}

export function assertPacket(packet) {
  const required = [
    "worker_id","phase","module","scope","branch","allowed_files","context_refs",
    "acceptance_criteria","dependencies","budget_limit_micros","canonical_sha","state"
  ];
  for (const key of required) {
    if (packet?.[key] === undefined || packet?.[key] === null) {
      throw new SupervisorError("INVALID_PACKET", `Missing ${key}`);
    }
  }
  if (!Array.isArray(packet.allowed_files) || !packet.allowed_files.length) {
    throw new SupervisorError("INVALID_PACKET", "allowed_files must be non-empty");
  }
  if (!Array.isArray(packet.acceptance_criteria) || !packet.acceptance_criteria.length) {
    throw new SupervisorError("INVALID_PACKET", "acceptance_criteria must be non-empty");
  }
  if (!STATES.includes(packet.state)) {
    throw new SupervisorError("INVALID_PACKET", "Unknown state", { state: packet.state });
  }
  if (!Number.isSafeInteger(packet.budget_limit_micros) || packet.budget_limit_micros < 0) {
    throw new SupervisorError("INVALID_PACKET", "Invalid budget_limit_micros");
  }
  return packet;
}

export function remainingBudget(packet) {
  return Math.max(0, packet.budget_limit_micros - (packet.budget_consumed_micros || 0));
}

export function dependencyState(packet, allPackets) {
  const deps = packet.dependencies || [];
  const missing = [];
  const incomplete = [];
  for (const id of deps) {
    const dep = allPackets.find(p => p.worker_id === id);
    if (!dep) missing.push(id);
    else if (dep.state !== "COMPLETE") incomplete.push({ worker_id: id, state: dep.state });
  }
  return { ready: missing.length === 0 && incomplete.length === 0, missing, incomplete };
}

export function fileScopesConflict(a, b) {
  const normalize = v => String(v).replace(/^\.\//, "").replace(/\*\*?$/, "");
  return (a.allowed_files || []).some(x => (b.allowed_files || []).some(y => {
    const ax = normalize(x), by = normalize(y);
    return ax === by || ax.startsWith(by) || by.startsWith(ax);
  }));
}

export function readyPackets(packets) {
  return packets.filter(packet => {
    if (packet.state !== "READY") return false;
    const deps = dependencyState(packet, packets);
    if (!deps.ready) return false;
    if (remainingBudget(packet) <= 0) return false;
    const runningConflict = packets.some(other =>
      other.worker_id !== packet.worker_id &&
      other.state === "RUNNING" &&
      fileScopesConflict(packet, other)
    );
    return !runningConflict;
  });
}

export function readyPhasePackets(packets, phase) {
  return readyPackets(packets).filter(p => p.phase === phase);
}

export function chooseModel(packet, routeHealth = {}) {
  const candidates = [packet.preferred_model, ...(packet.fallback_models || [])].filter(Boolean);
  for (const candidate of candidates) {
    const health = routeHealth[candidate];
    if (!health || health.available !== false) return candidate;
  }
  throw new SupervisorError("NO_QUALIFIED_MODEL", "No qualified model route is available", { candidates });
}

export function validateLaunch(packet, ctx) {
  assertPacket(packet);
  if (!["READY","FAILED","STOPPED"].includes(packet.state)) {
    throw new SupervisorError("INVALID_STATE", "Packet cannot launch from current state", { state: packet.state });
  }
  if (packet.canonical_sha !== ctx.currentCanonicalSha) {
    throw new SupervisorError("STALE_CANONICAL", "Packet canonical is stale", {
      packet_sha: packet.canonical_sha,
      current_sha: ctx.currentCanonicalSha
    });
  }
  const deps = dependencyState(packet, ctx.allPackets);
  if (!deps.ready) throw new SupervisorError("DEPENDENCY_NOT_READY", "Dependencies are not complete", deps);
  if (remainingBudget(packet) <= 0) throw new SupervisorError("BUDGET_EXHAUSTED", "Worker budget is exhausted");
  if ((packet.retry_count || 0) >= (packet.max_retries ?? 3) && packet.state === "FAILED") {
    throw new SupervisorError("RETRY_LIMIT", "Retry limit reached");
  }
  for (const other of ctx.allPackets) {
    if (other.worker_id !== packet.worker_id && other.state === "RUNNING" && fileScopesConflict(packet, other)) {
      throw new SupervisorError("WRITE_CONFLICT", "Another running worker overlaps allowed files", {
        conflicting_worker_id: other.worker_id
      });
    }
  }
  return true;
}

export function nextStateAfterExecution(packet, result) {
  if (result.cancelled) return { state: "STOPPED", reason: "cancelled" };
  if (result.blocker) return { state: "BLOCKED", reason: "genuine_blocker", blocker: result.blocker };
  if (result.failed) {
    const retries = (packet.retry_count || 0) + 1;
    if (retries >= (packet.max_retries ?? 3)) {
      return { state: "BLOCKED", reason: "repeated_failure", retry_count: retries };
    }
    return { state: "FAILED", reason: "retryable_failure", retry_count: retries };
  }
  if (result.acceptance?.all_satisfied === true && result.verification?.passed === true) {
    return { state: "NEEDS_REVIEW", reason: "candidate_complete_external_review_required" };
  }
  return { state: "READY", reason: "work_remaining_auto_continue" };
}

export function commandTransition(packet, command, payload = {}) {
  if (!COMMANDS.includes(command)) throw new SupervisorError("UNKNOWN_COMMAND", "Unknown supervisor command", { command });
  switch (command) {
    case "PAUSE":
      if (!["READY","RUNNING","FAILED"].includes(packet.state)) throw new SupervisorError("INVALID_STATE", "Cannot pause");
      return { ...packet, state: "PAUSED" };
    case "RESUME":
      if (packet.state !== "PAUSED") throw new SupervisorError("INVALID_STATE", "Cannot resume");
      return { ...packet, state: "READY" };
    case "STOP":
      if (!["READY","RUNNING","PAUSED","FAILED"].includes(packet.state)) throw new SupervisorError("INVALID_STATE", "Cannot stop");
      return { ...packet, state: "STOPPED" };
    case "RETRY":
      if (!["FAILED","BLOCKED","STOPPED"].includes(packet.state)) throw new SupervisorError("INVALID_STATE", "Cannot retry");
      return { ...packet, state: "READY", blocker: null };
    case "REASSIGN_MODEL":
      if (!payload.model) throw new SupervisorError("INVALID_COMMAND", "model is required");
      return { ...packet, preferred_model: payload.model, packet_version: (packet.packet_version || 1) + 1 };
    case "ADJUST_BUDGET":
      if (!Number.isSafeInteger(payload.budget_limit_micros) || payload.budget_limit_micros < (packet.budget_consumed_micros || 0)) {
        throw new SupervisorError("INVALID_COMMAND", "budget_limit_micros must cover spend already consumed");
      }
      return { ...packet, budget_limit_micros: payload.budget_limit_micros, packet_version: (packet.packet_version || 1) + 1 };
    case "SEND_TO_REVIEW":
      if (packet.state !== "NEEDS_REVIEW") throw new SupervisorError("INVALID_STATE", "Only a review candidate can be sent");
      return { ...packet, review_state: "PENDING" };
    case "RUN":
    case "CONTINUE":
      return packet;
  }
}

export function reviewDecision(packet, { approved, reviewer, evidence = [] }) {
  if (packet.state !== "NEEDS_REVIEW" || packet.review_state !== "PENDING") {
    throw new SupervisorError("INVALID_STATE", "Packet is not pending external review");
  }
  if (!reviewer) throw new SupervisorError("INVALID_REVIEW", "reviewer is required");
  if (approved) return { ...packet, state: "COMPLETE", review_state: "APPROVED", review_evidence: evidence };
  return { ...packet, state: "READY", review_state: "REJECTED", review_evidence: evidence };
}

export function makeExecutionId(workerId, packetVersion, checkpointSha = "root") {
  return `${workerId}:v${packetVersion || 1}:${checkpointSha || "root"}`;
}

export function makeIdempotencyKey(packet) {
  return makeExecutionId(packet.worker_id, packet.packet_version, packet.checkpoint_sha);
}
