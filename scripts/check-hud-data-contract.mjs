import assert from 'node:assert/strict';
import {
  ContractValidationError,
  IdempotencyConflictError,
  RevisionConflictError,
  SampleCareerAdapter,
  isStableId,
  safeSheetCell,
  toSafeSheetRow,
} from '../career-hud/sample-adapter.mjs';

const companyId = 'company_sample001';
const opportunityId = 'opp_sample001';
const clock = () => new Date('2026-10-06T09:00:00.000Z');
const adapter = new SampleCareerAdapter({
  clock,
  records: [{
    id: companyId,
    kind: 'company',
    name: 'Sample Company — preview only',
    revision: 1,
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-06T08:00:00.000Z',
  }],
});

assert(isStableId('company', companyId));
assert(!isStableId('company', 'Sample Company'));
assert(!isStableId('opportunity', companyId));
assert.throws(() => adapter.create('opportunity', { id: 'opportunity-001' }, { actionId: 'action_create01' }), ContractValidationError);

const create = adapter.create('opportunity', {
  id: opportunityId,
  companyId,
  role: 'Sample role — preview only',
  status: 'researching',
}, { actionId: 'action_create02' });
assert.equal(create.replayed, false);
assert.equal(create.record.revision, 1);
assert.equal(create.record.companyId, companyId);
assert.throws(() => adapter.create('opportunity', {
  id: 'opp_missing1',
  companyId: 'company_missing1',
  role: 'Broken relationship',
}, { actionId: 'action_invalid01' }), ContractValidationError, 'Relationships must point to an active record of the declared kind.');
assert.throws(() => adapter.archive('company', companyId, {
  actionId: 'action_parent01', expectedRevision: 1,
}), ContractValidationError, 'Active dependent records prevent an orphaning parent archive.');

const replay = adapter.create('opportunity', {
  id: opportunityId,
  companyId,
  role: 'Sample role — preview only',
  status: 'researching',
}, { actionId: 'action_create02' });
assert.equal(replay.replayed, true, 'The same action ID does not duplicate a mutation.');
assert.equal(adapter.list('opportunity').length, 1);
assert.throws(() => adapter.create('opportunity', {
  id: opportunityId,
  companyId,
  role: 'Different command',
}, { actionId: 'action_create02' }), IdempotencyConflictError);

assert.throws(() => adapter.update('opportunity', opportunityId, { status: 'applied' }, {
  actionId: 'action_update01', expectedRevision: 99,
}), RevisionConflictError, 'Stale expected revisions conflict instead of overwriting records.');

const update = adapter.update('opportunity', opportunityId, { status: 'applied' }, {
  actionId: 'action_update02', expectedRevision: 1,
});
assert.equal(update.record.revision, 2);
assert.equal(update.record.status, 'applied');

const archived = adapter.archive('opportunity', opportunityId, {
  actionId: 'action_archive01', expectedRevision: 2,
});
assert.equal(archived.record.id, opportunityId, 'Archive preserves the stable record ID.');
assert.equal(archived.record.revision, 3);
assert(archived.record.archivedAt);
assert.equal(adapter.get('opportunity', opportunityId), null, 'Archived records are absent from the default active view.');
assert.equal(adapter.get('opportunity', opportunityId, { includeArchived: true }).id, opportunityId);

const restored = adapter.restore('opportunity', opportunityId, {
  actionId: 'action_restore01', expectedRevision: 3,
});
assert.equal(restored.record.id, opportunityId, 'Restore keeps the original stable ID.');
assert.equal(restored.record.revision, 4);
assert.equal(restored.record.archivedAt, null);
assert.equal(adapter.list('opportunity').length, 1);

assert.equal(safeSheetCell('=IMPORTXML("https://not-a-real-domain.invalid")'), "'=IMPORTXML(\"https://not-a-real-domain.invalid\")");
assert.equal(safeSheetCell(' \t+1+1'), "' \t+1+1");
assert.equal(safeSheetCell(42), 42, 'Native numeric cells are not string-escaped.');
assert.deepEqual(toSafeSheetRow({ name: '@mention', count: 1 }, ['name', 'count']), ["'@mention", 1]);

console.log('Career HUD data contract: stable IDs, validation, idempotent action IDs, expected-revision conflicts, archive/restore, and Sheets formula-safe rows passed.');
