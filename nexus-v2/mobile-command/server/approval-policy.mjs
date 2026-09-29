// Pure policy for a future Agency API; not an authentication or storage service.
// The API must load actor/grants from its verified session, never the request body.
export function decideApproval(record, input, actor, now = Date.now()) {
  const fail = code => { throw Object.assign(new Error(code), { code }); };
  if (!actor?.id || !actor.projects?.includes(record.projectId) ||
      !actor.permissions?.includes('approval:decide')) fail('FORBIDDEN');
  if (!['APPROVE_ONCE', 'REJECT'].includes(input.decision)) fail('INVALID_DECISION');
  if (!input.requestId || typeof input.requestId !== 'string') fail('REQUEST_ID_REQUIRED');
  if (input.projectId !== record.projectId || input.packetId !== record.packetId ||
      input.executionId !== record.executionId || input.actionDigest !== record.actionDigest)
    fail('SCOPE_CHANGED');
  if (record.decisionRequestId === input.requestId && record.decidedBy === actor.id &&
      record.decision === input.decision) return structuredClone(record);
  if (record.status !== 'PENDING') fail('ALREADY_DECIDED');
  if (input.version !== record.version) fail('STALE_VERSION');
  if (!Number.isFinite(Date.parse(record.expiresAt)) || Date.parse(record.expiresAt) <= now)
    fail('EXPIRED');
  // No approval on this surface may grant merge, workflow, security, or deployment authority.
  // Route elevated actions to a separately reviewed policy instead.
  if (input.decision === 'APPROVE_ONCE' &&
      (record.risk !== 'ROUTINE' || record.policyAllowed !== true)) fail('ELEVATED_OR_UNVERIFIED');
  return { ...record, status: input.decision === 'APPROVE_ONCE' ? 'APPROVED' : 'REJECTED',
    decision: input.decision, decisionRequestId: input.requestId, decidedBy: actor.id,
    decidedAt: new Date(now).toISOString(), version: record.version + 1 };
}

// A tool permission is not a Work Packet acceptance/review decision.
// Values are supplied by the installed SDK's enum to avoid hard-coded wire values.
export function factoryOutcome(record, { projectId, packetId, executionId, actionDigest }, options, outcomes, now = Date.now()) {
  const allowed = record.kind === 'PROVIDER_PERMISSION' && record.status === 'APPROVED' &&
    record.decision === 'APPROVE_ONCE' && record.policyAllowed === true && record.risk === 'ROUTINE' &&
    Date.parse(record.expiresAt) > now && record.projectId === projectId &&
    record.packetId === packetId && record.executionId === executionId && record.actionDigest === actionDigest;
  const outcome = allowed ? outcomes.ProceedOnce : outcomes.Cancel;
  if (!options.some(option => option.value === outcome)) throw new Error('OUTCOME_NOT_OFFERED');
  return outcome;
}

// Persist this transition with compare-and-swap in the SAME transaction as an
// outbox item. A pure function alone does not provide distributed exactly-once.
export function consumeApproval(record, context, options, outcomes, now = Date.now()) {
  if (record.dispatchedAt) throw new Error('ALREADY_DISPATCHED');
  const outcome = factoryOutcome(record, context, options, outcomes, now);
  if (outcome !== outcomes.ProceedOnce) throw new Error('NOT_APPROVED_FOR_DISPATCH');
  return { record: { ...record, dispatchedAt: new Date(now).toISOString(), version: record.version + 1 }, outcome };
}
