import { ContractValidationError, assertStableId } from './sample-adapter.mjs';

export { ContractValidationError };

// This is the private-backend boundary only. It deliberately has no Google SDK,
// browser fetch, OAuth, or credential handling; a private service injects fetchValues.
export const opportunitiesSheetColumns = Object.freeze([
  'opportunity_id',
  'company',
  'title',
  'official_url',
  'location',
  'work_arrangement',
  'salary_min',
  'salary_max',
  'salary_currency',
  'salary_basis',
  'total_comp_min',
  'total_comp_max',
  'compensation_notes',
  'fit_rationale',
  'gaps',
  'status',
  'discovered_date',
  'verified_date',
  'next_action',
  'notes',
  'source_evidence',
  'posting_status',
  'application_status',
  'schema_version',
]);

const requiredColumns = new Set([
  'opportunity_id',
  'company',
  'title',
  'status',
  'application_status',
  'schema_version',
]);

export const defaultOpportunitiesRange = 'Opportunities!A:X';

function asText(value, label, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ContractValidationError(`${label} is required.`);
    return '';
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ContractValidationError(`${label} must be a text cell.`);
  }
  const text = String(value).trim();
  if (required && !text) throw new ContractValidationError(`${label} is required.`);
  return text;
}

function asOptionalNumber(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(number) || number < 0) {
    throw new ContractValidationError(`${label} must be a non-negative number or blank.`);
  }
  return number;
}

function asIsoDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return sheetsSerialDate(value, label);
  if (typeof value !== 'string') throw new ContractValidationError(`${label} must be an ISO date, Sheets date serial, or blank.`);
  const text = value.trim();
  if (!text) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return sheetsSerialDate(Number(text), label);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new ContractValidationError(`${label} must be an ISO date, Sheets date serial, or blank.`);
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ContractValidationError(`${label} must be a calendar-valid ISO date.`);
  }
  return text;
}

function sheetsSerialDate(serial, label) {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100_000) {
    throw new ContractValidationError(`${label} Sheets date serial is out of range.`);
  }
  // Google Sheets date serials use the 1899-12-30 epoch. Use UTC arithmetic so
  // results never depend on the executor's locale, browser locale, or DST.
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86_400_000));
  return date.toISOString().slice(0, 10);
}

function asOfficialUrl(value) {
  const text = asText(value, 'official_url');
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') throw new Error('Official job URLs must use HTTPS.');
    return url.toString();
  } catch {
    throw new ContractValidationError('official_url must be an HTTPS URL or blank.');
  }
}

function headerIndex(values) {
  if (!Array.isArray(values) || values.length === 0 || !Array.isArray(values[0])) {
    throw new ContractValidationError('Opportunities read must include a header row.');
  }
  const index = new Map();
  for (const [columnIndex, header] of values[0].entries()) {
    const normalized = asText(header, `header ${columnIndex + 1}`).toLowerCase();
    if (!normalized) continue;
    if (index.has(normalized)) throw new ContractValidationError(`Duplicate Opportunities header: ${normalized}.`);
    index.set(normalized, columnIndex);
  }
  for (const column of requiredColumns) {
    if (!index.has(column)) throw new ContractValidationError(`Missing required Opportunities column: ${column}.`);
  }
  return index;
}

function valueAt(row, index, name) {
  const position = index.get(name);
  return position === undefined ? '' : row[position];
}

function hasContent(row) {
  return row.some(value => value !== undefined && value !== null && String(value).trim() !== '');
}

function opportunityFromRow(row, index, rowNumber) {
  if (!Array.isArray(row)) throw new ContractValidationError(`Opportunities row ${rowNumber} must be a cell array.`);
  const id = asText(valueAt(row, index, 'opportunity_id'), 'opportunity_id', { required: true });
  assertStableId('opportunity', id, 'opportunity_id');

  const title = asText(valueAt(row, index, 'title'), 'title', { required: true });
  const status = asText(valueAt(row, index, 'status'), 'status', { required: true });
  const applicationStatus = asText(valueAt(row, index, 'application_status'), 'application_status', { required: true });
  const schemaVersion = asText(valueAt(row, index, 'schema_version'), 'schema_version', { required: true });
  if (schemaVersion !== 'v1') throw new ContractValidationError('schema_version must be v1 for Opportunities!A:X.');

  return Object.freeze({
    id,
    company: asText(valueAt(row, index, 'company'), 'company', { required: true }),
    title,
    // The existing HUD display calls this a role; the Sheet's canonical source name is title.
    role: title,
    officialUrl: asOfficialUrl(valueAt(row, index, 'official_url')),
    location: asText(valueAt(row, index, 'location')) || null,
    workArrangement: asText(valueAt(row, index, 'work_arrangement')) || null,
    salaryMin: asOptionalNumber(valueAt(row, index, 'salary_min'), 'salary_min'),
    salaryMax: asOptionalNumber(valueAt(row, index, 'salary_max'), 'salary_max'),
    salaryCurrency: asText(valueAt(row, index, 'salary_currency')) || null,
    salaryBasis: asText(valueAt(row, index, 'salary_basis')) || null,
    totalCompMin: asOptionalNumber(valueAt(row, index, 'total_comp_min'), 'total_comp_min'),
    totalCompMax: asOptionalNumber(valueAt(row, index, 'total_comp_max'), 'total_comp_max'),
    compensationNotes: asText(valueAt(row, index, 'compensation_notes')) || null,
    fitRationale: asText(valueAt(row, index, 'fit_rationale')) || null,
    gaps: asText(valueAt(row, index, 'gaps')) || null,
    status,
    discoveredDate: asIsoDate(valueAt(row, index, 'discovered_date'), 'discovered_date'),
    verifiedDate: asIsoDate(valueAt(row, index, 'verified_date'), 'verified_date'),
    nextAction: asText(valueAt(row, index, 'next_action')) || null,
    notes: asText(valueAt(row, index, 'notes')) || null,
    sourceEvidence: asText(valueAt(row, index, 'source_evidence')) || null,
    postingStatus: asText(valueAt(row, index, 'posting_status')) || null,
    applicationStatus,
    schemaVersion,
    // A:X/v1 is read-only: company IDs, record revisions, and archive state do not exist yet.
    companyId: null,
    sourceMode: 'read-only-sheet-v1',
  });
}

export function parseOpportunitiesSheet(values) {
  const index = headerIndex(values);
  const opportunities = [];
  const ids = new Set();
  for (let offset = 1; offset < values.length; offset += 1) {
    const row = values[offset];
    if (!Array.isArray(row) || !hasContent(row)) continue;
    const opportunity = opportunityFromRow(row, index, offset + 1);
    if (ids.has(opportunity.id)) throw new ContractValidationError(`Duplicate opportunity_id: ${opportunity.id}.`);
    ids.add(opportunity.id);
    opportunities.push(opportunity);
  }
  return Object.freeze(opportunities);
}

function assertSpreadsheetId(spreadsheetId) {
  if (typeof spreadsheetId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(spreadsheetId)) {
    throw new ContractValidationError('A stable private spreadsheetId is required.');
  }
  return spreadsheetId;
}

export function createPrivateSheetsOpportunityReader({ spreadsheetId, fetchValues, range = defaultOpportunitiesRange } = {}) {
  assertSpreadsheetId(spreadsheetId);
  if (typeof fetchValues !== 'function') {
    throw new ContractValidationError('A private fetchValues dependency is required.');
  }
  if (typeof range !== 'string' || !/^Opportunities![A-Z]+:[A-Z]+$/.test(range)) {
    throw new ContractValidationError('range must be an Opportunities A1 column range.');
  }

  return Object.freeze({
    async listOpportunities() {
      const response = await fetchValues({ spreadsheetId, range });
      if (!response || !Array.isArray(response.values)) {
        throw new ContractValidationError('Private Sheets reader returned no values array.');
      }
      return parseOpportunitiesSheet(response.values);
    },
  });
}
