import test from 'node:test';
import assert from 'node:assert/strict';
import { decideApproval, factoryOutcome, consumeApproval } from './approval-policy.mjs';
const now = Date.parse('2026-09-23T12:00:00Z');
const record = { id: 'a1', projectId: 'nexus', packetId: 'p1', executionId: 'e1',
  kind: 'PROVIDER_PERMISSION', actionDigest: 'digest', status: 'PENDING', version: 1,
  policyAllowed: true, risk: 'ROUTINE', expiresAt: '2026-09-23T12:05:00Z' };
const actor = { id: 'operator', projects: ['nexus'], permissions: ['approval:decide'] };
const input = { projectId: 'nexus', packetId: 'p1', executionId: 'e1', actionDigest: 'digest',
  decision: 'APPROVE_ONCE', version: 1, requestId: 'r1' };
test('one decision is idempotent and cannot be changed by another phone', () => {
  const decided = decideApproval(record, input, actor, now);
  assert.equal(decided.status, 'APPROVED');
  assert.deepEqual(decideApproval(decided, input, actor, now), decided);
  assert.throws(() => decideApproval(decided, { ...input, requestId: 'r2', decision: 'REJECT' }, actor, now), /ALREADY_DECIDED/);
  assert.equal(record.status, 'PENDING');
});
test('project and actor isolation', () => {
  assert.throws(() => decideApproval(record, input, { ...actor, projects: ['client'] }, now), /FORBIDDEN/);
  assert.throws(() => decideApproval(record, input, { ...actor, permissions: [] }, now), /FORBIDDEN/);
});
test('expired, stale, changed and elevated actions fail closed', () => {
  assert.throws(() => decideApproval(record, input, actor, now + 300001), /EXPIRED/);
  assert.throws(() => decideApproval(record, { ...input, version: 0 }, actor, now), /STALE_VERSION/);
  for (const key of ['projectId', 'packetId', 'executionId', 'actionDigest'])
    assert.throws(() => decideApproval(record, { ...input, [key]: 'changed' }, actor, now), /SCOPE_CHANGED/);
  assert.throws(() => decideApproval({ ...record, risk: 'ELEVATED' }, input, actor, now), /ELEVATED_OR_UNVERIFIED/);
  assert.throws(() => decideApproval({ ...record, policyAllowed: false }, input, actor, now), /ELEVATED_OR_UNVERIFIED/);
});
test('reject remains possible for elevated actions; allow-always is forbidden', () => {
  assert.equal(decideApproval({ ...record, risk: 'ELEVATED' }, { ...input, decision: 'REJECT' }, actor, now).status, 'REJECTED');
  assert.throws(() => decideApproval(record, { ...input, decision: 'PROCEED_ALWAYS' }, actor, now), /INVALID_DECISION/);
});
test('SDK mapping only allows exact, current, routine provider permission once', () => {
  const outcomes = { ProceedOnce: 'once', Cancel: 'cancel' };
  const options = [{ value: 'once' }, { value: 'cancel' }];
  const approved = decideApproval(record, input, actor, now);
  assert.equal(factoryOutcome(approved, input, options, outcomes, now), 'once');
  assert.equal(factoryOutcome(approved, { ...input, executionId: 'other' }, options, outcomes, now), 'cancel');
  assert.equal(factoryOutcome(approved, input, options, outcomes, now + 300001), 'cancel');
  assert.equal(factoryOutcome({ ...approved, kind: 'AGENCY_REVIEW' }, input, options, outcomes, now), 'cancel');
  assert.throws(() => factoryOutcome(approved, input, [{ value: 'cancel' }], outcomes, now), /OUTCOME_NOT_OFFERED/);
});
test('dispatch transition refuses replay or a changed action', () => {
  const approved = decideApproval(record, input, actor, now);
  const outcomes = { ProceedOnce: 'once', Cancel: 'cancel' };
  const options = [{ value: 'once' }, { value: 'cancel' }];
  const consumed = consumeApproval(approved, input, options, outcomes, now);
  assert.equal(consumed.outcome, 'once');
  assert.throws(() => consumeApproval(consumed.record, input, options, outcomes, now), /ALREADY_DISPATCHED/);
  assert.throws(() => consumeApproval(approved, { ...input, actionDigest: 'changed' }, options, outcomes, now), /NOT_APPROVED_FOR_DISPATCH/);
});
