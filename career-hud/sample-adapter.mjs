// Repository-independent, in-memory reference adapter for the future private
// Career HUD backend. It intentionally has no Google, Drive, or network imports.

export const entityPrefixes = Object.freeze({
  company: 'company',
  opportunity: 'opp',
  contact: 'contact',
  task: 'task',
  document: 'document',
  activity: 'activity',
});

const entityKinds = new Set(Object.keys(entityPrefixes));
const relationshipTargets = Object.freeze({
  opportunity: { companyId: 'company' },
  contact: { companyId: 'company' },
  task: { opportunityId: 'opportunity', contactId: 'contact' },
  document: { opportunityId: 'opportunity', companyId: 'company' },
  activity: { opportunityId: 'opportunity', contactId: 'contact', taskId: 'task' },
});

export class ContractValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContractValidationError';
  }
}

export class RevisionConflictError extends Error {
  constructor(id, expectedRevision, currentRevision) {
    super(`Revision conflict for ${id}: expected ${expectedRevision}, current ${currentRevision}.`);
    this.name = 'RevisionConflictError';
    this.id = id;
    this.expectedRevision = expectedRevision;
    this.currentRevision = currentRevision;
  }
}

export class IdempotencyConflictError extends Error {
  constructor(actionId) {
    super(`Action ${actionId} was already used for a different mutation.`);
    this.name = 'IdempotencyConflictError';
    this.actionId = actionId;
  }
}

function clone(value) {
  return structuredClone(value);
}

function fingerprint(value) {
  return JSON.stringify(value);
}

function asKind(kind) {
  if (!entityKinds.has(kind)) throw new ContractValidationError(`Unsupported record kind: ${kind}.`);
  return kind;
}

export function isStableId(kind, id) {
  if (!entityKinds.has(kind) || typeof id !== 'string') return false;
  const prefix = entityPrefixes[kind];
  return new RegExp(`^${prefix}_[A-Za-z0-9][A-Za-z0-9_-]{7,127}$`).test(id);
}

export function assertStableId(kind, id, label = 'id') {
  asKind(kind);
  if (!isStableId(kind, id)) {
    throw new ContractValidationError(`${label} must be an immutable ${entityPrefixes[kind]}_* identifier.`);
  }
  return id;
}

export function assertActionId(actionId) {
  if (typeof actionId !== 'string' || !/^action_[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(actionId)) {
    throw new ContractValidationError('actionId must be an immutable action_* identifier.');
  }
  return actionId;
}

// Use this at the boundary that writes string values to a spreadsheet. Formula
// characters remain allowed in the private record, but are never emitted as a
// Sheets formula. Numeric and boolean cells retain their native types.
export function safeSheetCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = String(value).replaceAll('\0', '');
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function toSafeSheetRow(record, columns) {
  if (!record || typeof record !== 'object' || !Array.isArray(columns)) {
    throw new ContractValidationError('A record and explicit column list are required for a Sheets row.');
  }
  return columns.map(column => safeSheetCell(record[column]));
}

function timestamps(clock) {
  const timestamp = clock().toISOString();
  return { createdAt: timestamp, updatedAt: timestamp };
}

export class SampleCareerAdapter {
  #actions = new Map();
  #clock;
  #records = new Map();

  constructor({ clock = () => new Date(), records = [] } = {}) {
    this.#clock = clock;
    for (const record of records) this.#seed(record);
  }

  #seed(record) {
    if (!record || typeof record !== 'object') throw new ContractValidationError('Seed record must be an object.');
    const kind = asKind(record.kind);
    assertStableId(kind, record.id);
    if (this.#records.has(record.id)) throw new ContractValidationError(`Duplicate stable ID: ${record.id}.`);
    const revision = Number.isInteger(record.revision) && record.revision > 0 ? record.revision : 1;
    const seed = clone({ ...record, kind, revision, archivedAt: record.archivedAt || null });
    this.#assertRelationships(kind, seed);
    this.#records.set(record.id, seed);
  }

  #record(kind, id) {
    assertStableId(kind, id);
    const record = this.#records.get(id);
    if (!record || record.kind !== kind) throw new ContractValidationError(`Unknown ${kind} ID: ${id}.`);
    return record;
  }

  #assertRelationships(kind, candidate) {
    const relationships = relationshipTargets[kind] || {};
    let activityParents = 0;
    for (const [field, targetKind] of Object.entries(relationships)) {
      const value = candidate[field];
      if (value === undefined || value === null || value === '') continue;
      assertStableId(targetKind, value, field);
      const parent = this.#records.get(value);
      if (!parent || parent.kind !== targetKind || parent.archivedAt) {
        throw new ContractValidationError(`${field} must reference an active ${targetKind}.`);
      }
      if (kind === 'activity') activityParents += 1;
    }
    if (kind === 'activity' && activityParents !== 1) {
      throw new ContractValidationError('An activity must reference exactly one parent record.');
    }
  }

  #assertNoActiveDependents(id) {
    for (const candidate of this.#records.values()) {
      if (candidate.archivedAt) continue;
      const relationships = relationshipTargets[candidate.kind] || {};
      if (Object.keys(relationships).some(field => candidate[field] === id)) {
        throw new ContractValidationError(`Cannot archive ${id} while active ${candidate.kind} ${candidate.id} references it.`);
      }
    }
  }

  #mutate(actionId, command, apply) {
    assertActionId(actionId);
    const actionFingerprint = fingerprint(command);
    const prior = this.#actions.get(actionId);
    if (prior) {
      if (prior.fingerprint !== actionFingerprint) throw new IdempotencyConflictError(actionId);
      return { record: clone(prior.record), replayed: true };
    }
    const record = apply();
    this.#actions.set(actionId, { fingerprint: actionFingerprint, record: clone(record) });
    return { record: clone(record), replayed: false };
  }

  get(kind, id, { includeArchived = false } = {}) {
    const record = this.#record(kind, id);
    return record.archivedAt && !includeArchived ? null : clone(record);
  }

  list(kind, { includeArchived = false } = {}) {
    asKind(kind);
    return [...this.#records.values()]
      .filter(record => record.kind === kind && (includeArchived || !record.archivedAt))
      .map(clone);
  }

  snapshot({ includeArchived = false } = {}) {
    return {
      companies: this.list('company', { includeArchived }),
      opportunities: this.list('opportunity', { includeArchived }),
      contacts: this.list('contact', { includeArchived }),
      tasks: this.list('task', { includeArchived }),
      documents: this.list('document', { includeArchived }),
      activity: this.list('activity', { includeArchived }),
    };
  }

  create(kind, input, { actionId } = {}) {
    kind = asKind(kind);
    if (!input || typeof input !== 'object') throw new ContractValidationError('Create input must be an object.');
    assertStableId(kind, input.id);
    const command = { operation: 'create', kind, input: clone(input) };
    return this.#mutate(actionId, command, () => {
      if (this.#records.has(input.id)) throw new ContractValidationError(`Stable ID already exists: ${input.id}.`);
      const time = timestamps(this.#clock);
      const record = { ...clone(input), ...time, archivedAt: null, kind, revision: 1 };
      this.#assertRelationships(kind, record);
      this.#records.set(record.id, record);
      return record;
    });
  }

  update(kind, id, patch, { actionId, expectedRevision } = {}) {
    kind = asKind(kind);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new ContractValidationError('Update patch must be an object.');
    if ('id' in patch || 'kind' in patch || 'revision' in patch || 'archivedAt' in patch || 'createdAt' in patch || 'updatedAt' in patch) {
      throw new ContractValidationError('Identity, revision, archive state, and timestamps are adapter-managed.');
    }
    const command = { operation: 'update', kind, id, patch: clone(patch), expectedRevision };
    return this.#mutate(actionId, command, () => {
      const current = this.#record(kind, id);
      if (!Number.isInteger(expectedRevision) || expectedRevision !== current.revision) {
        throw new RevisionConflictError(id, expectedRevision, current.revision);
      }
      if (current.archivedAt) throw new ContractValidationError(`Archived ${kind} records must be restored before updating.`);
      const record = { ...current, ...clone(patch), revision: current.revision + 1, updatedAt: this.#clock().toISOString() };
      this.#assertRelationships(kind, record);
      this.#records.set(id, record);
      return record;
    });
  }

  archive(kind, id, { actionId, expectedRevision } = {}) {
    kind = asKind(kind);
    const command = { operation: 'archive', kind, id, expectedRevision };
    return this.#mutate(actionId, command, () => {
      const current = this.#record(kind, id);
      if (!Number.isInteger(expectedRevision) || expectedRevision !== current.revision) {
        throw new RevisionConflictError(id, expectedRevision, current.revision);
      }
      if (current.archivedAt) throw new ContractValidationError(`${kind} record is already archived.`);
      this.#assertNoActiveDependents(id);
      const record = { ...current, archivedAt: this.#clock().toISOString(), revision: current.revision + 1, updatedAt: this.#clock().toISOString() };
      this.#records.set(id, record);
      return record;
    });
  }

  restore(kind, id, { actionId, expectedRevision } = {}) {
    kind = asKind(kind);
    const command = { operation: 'restore', kind, id, expectedRevision };
    return this.#mutate(actionId, command, () => {
      const current = this.#record(kind, id);
      if (!Number.isInteger(expectedRevision) || expectedRevision !== current.revision) {
        throw new RevisionConflictError(id, expectedRevision, current.revision);
      }
      if (!current.archivedAt) throw new ContractValidationError(`${kind} record is not archived.`);
      const record = { ...current, archivedAt: null, revision: current.revision + 1, updatedAt: this.#clock().toISOString() };
      this.#assertRelationships(kind, record);
      this.#records.set(id, record);
      return record;
    });
  }
}
