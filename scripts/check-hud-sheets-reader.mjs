import assert from 'node:assert/strict';
import {
  ContractValidationError,
  createPrivateSheetsOpportunityReader,
  defaultOpportunitiesRange,
  opportunitiesSheetColumns,
  parseOpportunitiesSheet,
} from '../career-hud/google-sheets-opportunities-reader.mjs';

const sampleOpportunity = {
  opportunity_id: 'opp_sheet001',
  company: 'Sample Company — preview only',
  title: 'Sample operating role',
  official_url: 'https://careers.example.invalid/jobs/sample',
  location: 'Remote',
  work_arrangement: 'Hybrid',
  salary_min: '150000',
  salary_max: '190000',
  salary_currency: 'USD',
  salary_basis: 'annual',
  total_comp_min: '',
  total_comp_max: '',
  compensation_notes: '',
  fit_rationale: 'Sample rationale only',
  gaps: '',
  status: 'research_lead',
  discovered_date: 46301,
  verified_date: 46301,
  next_action: 'Verify with the official listing',
  notes: '',
  source_evidence: 'Sample source evidence only',
  posting_status: 'open',
  application_status: 'not_applied',
  schema_version: 'v1',
};

function valuesFor(...records) {
  return [opportunitiesSheetColumns, ...records.map(record => opportunitiesSheetColumns.map(column => record[column] ?? ''))];
}

let calls = 0;
const reader = createPrivateSheetsOpportunityReader({
  spreadsheetId: 'sampleSheetId_12345',
  fetchValues: async request => {
    calls += 1;
    assert.deepEqual(request, { spreadsheetId: 'sampleSheetId_12345', range: defaultOpportunitiesRange });
    return { values: valuesFor(sampleOpportunity) };
  },
});
assert.equal(calls, 0, 'Reader construction does not access Google Sheets.');
const opportunities = await reader.listOpportunities();
assert.equal(calls, 1);
assert.equal(opportunities.length, 1);
assert.equal(opportunities[0].id, sampleOpportunity.opportunity_id);
assert.equal(opportunities[0].companyId, null, 'A:X/v1 has company display text but no stable company ID.');
assert.equal(opportunities[0].sourceMode, 'read-only-sheet-v1');
assert.equal(opportunities[0].title, sampleOpportunity.title);
assert.equal(opportunities[0].role, sampleOpportunity.title, 'title maps to the HUD display role without changing the source column.');
assert.equal(opportunities[0].salaryMin, 150000);
assert.equal(opportunities[0].totalCompMin, null, 'Blank unknown numeric values remain null.');
assert.equal(opportunities[0].officialUrl, sampleOpportunity.official_url);
assert.equal(opportunities[0].discoveredDate, '2026-10-06', 'Google date serials normalize in UTC, not through locale parsing.');
assert.equal(opportunities[0].verifiedDate, '2026-10-06');

const missingStatus = opportunitiesSheetColumns.filter(column => column !== 'status');
assert.throws(() => parseOpportunitiesSheet([missingStatus, missingStatus.map(column => sampleOpportunity[column] ?? '')]), ContractValidationError);
assert.throws(() => parseOpportunitiesSheet(valuesFor({ ...sampleOpportunity, schema_version: 'v2' })), ContractValidationError);
assert.throws(() => parseOpportunitiesSheet(valuesFor({ ...sampleOpportunity, discovered_date: '10/06/2026' })), ContractValidationError, 'Locale-formatted dates are never parsed.');
assert.throws(() => parseOpportunitiesSheet(valuesFor({ ...sampleOpportunity, salary_min: '-1' })), ContractValidationError);
assert.throws(() => parseOpportunitiesSheet(valuesFor({ ...sampleOpportunity, official_url: 'http://example.invalid/job' })), ContractValidationError);
assert.throws(() => parseOpportunitiesSheet(valuesFor(sampleOpportunity, sampleOpportunity)), ContractValidationError);

console.log('Career HUD private Opportunities reader: A:X/v1 schema, stable IDs, title mapping, ISO dates, blank numeric values, read-only source limits, and no-read-until-invoked behavior passed.');
