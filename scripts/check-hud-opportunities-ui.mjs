import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('docs/hud/hud.js', 'utf8').replace(
  '\ninit();',
  '\nglobalThis.__hudTest = { trustedCareerSheetUrl, normalizeLiveOpportunities, normalizeLiveToday, normalizeLiveReferences, normalizeConnectionSettings, normalizeConnectionTest, readBoundedReferencesJson, trustedReferenceEmail, trustedReferencePhone, trustedLinkedInUrl, localDateKey, mondayFor, REFERENCES_MAX_BYTES, REFERENCES_MAX_RECORDS };'
);
const context = {
  window: { location: { origin: 'https://nicolasgoureau.com' } },
  globalThis: {},
  console,
  Intl,
  Date,
  Map,
  Set,
  String,
  Array,
  RegExp,
  URL,
  TextDecoder,
  Uint8Array
};
vm.runInNewContext(source, context, { filename: 'docs/hud/hud.js' });
const { trustedCareerSheetUrl, normalizeLiveOpportunities, normalizeLiveToday, normalizeLiveReferences, normalizeConnectionSettings, normalizeConnectionTest, readBoundedReferencesJson, trustedReferenceEmail, trustedReferencePhone, trustedLinkedInUrl, localDateKey, mondayFor, REFERENCES_MAX_BYTES, REFERENCES_MAX_RECORDS } = context.globalThis.__hudTest;

const wednesday = new Date('2026-10-07T12:00:00');
assert.equal(localDateKey(wednesday), '2026-10-07', 'The sample-week key is derived from the actual local date.');
assert.equal(localDateKey(mondayFor(wednesday)), '2026-10-05', 'A Wednesday header derives its Monday-to-Friday strip rather than a stale Tuesday sample.');

const values = [
  ['opportunity_id', 'company', 'title', 'location', 'work_arrangement', 'fit_rationale', 'status', 'next_action'],
  ['opp_runtime_001', 'Example Company', 'Example role', 'Remote', 'Hybrid', 'Actual fit rationale', 'research', 'Review the listing'],
  ['untrusted', 'Ignored Company', 'Ignored role', '', '', '', '', '']
];
const opportunities = normalizeLiveOpportunities(values, { opp_runtime_001: 'a'.repeat(64) });
assert.equal(opportunities.length, 1, 'Only stable opportunity IDs are rendered.');
assert.deepEqual(
  JSON.parse(JSON.stringify(opportunities[0])),
  {
    id: 'opp_runtime_001',
    companyId: 'live_opp_runtime_001',
    company: 'Example Company',
    role: 'Example role',
    status: 'research',
    statusClass: 'research',
    summary: 'Remote · Hybrid',
    fit: 'Actual fit rationale',
    contact: 'Private opportunities source',
    revision: 'a'.repeat(64),
    nextAction: { id: 'next_opp_runtime_001', label: 'Review the listing', complete: false },
    activity: []
  },
  'Rendered details come from the protected response rather than invented records.'
);

const legacyStatus = normalizeLiveOpportunities([
  values[0],
  ['opp_runtime_002', 'Example Company', 'Example role', '', '', '', 'legacy status\"><script', 'Review the listing']
], { opp_runtime_002: 'not-a-revision' });
assert.equal(legacyStatus[0].status, 'legacy status"><script', 'Legacy labels remain readable.');
assert.equal(legacyStatus[0].statusClass, 'research', 'Only an approved status can become a CSS class.');
assert.equal(legacyStatus[0].revision, null, 'An invalid source revision never enables a blind live save.');

const today = normalizeLiveToday([
  { id: 'followup_runtime_001', opportunityId: 'opp_runtime_001', title: 'Review the listing', detail: 'Example Company — Example role' },
  { opportunityId: 'wrong-id', title: 'Ignored follow-up' }
]);
assert.equal(today.length, 1, 'Only follow-ups tied to stable opportunity IDs are rendered.');
assert.equal(today[0].detail, 'Example Company — Example role');

const runtimeSheetUrl = `https://${'docs.google.com'}/${['spreadsheets', 'd', 'runtime_only_001', 'edit'].join('/')}#gid=42`;
assert.equal(
  trustedCareerSheetUrl(runtimeSheetUrl),
  runtimeSheetUrl,
  'The approved runtime-only Sheet link is accepted.'
);
assert.equal(trustedCareerSheetUrl('https://example.invalid/not-a-sheet'), null, 'Off-origin links are hidden.');
assert.equal(trustedCareerSheetUrl('/spreadsheets/d/runtime_only_001/edit'), null, 'Relative links are hidden.');

const connections = normalizeConnectionSettings({
  revision: 0,
  sources: {
    opportunities: { url: 'https://docs.google.com/spreadsheets/d/opportunities/edit', state: 'active', status: 'ready' },
    references: { url: 'https://docs.google.com/spreadsheets/d/references/edit', state: 'default', status: 'not_tested' },
    photos: { url: 'https://drive.google.com/drive/folders/photos', state: 'active', status: 'unavailable' },
  },
});
assert.equal(connections.revision, 0, 'Initial private connection settings accept revision zero.');
assert.equal(connections.sources.photos.status, 'unavailable', 'Connection state comes only from the protected settings response.');
const connectionsWithEmptyUrls = normalizeConnectionSettings({
  revision: 1,
  sources: {
    opportunities: { url: '', state: 'default', status: 'not_tested' },
    references: { url: '', state: 'default', status: 'not_tested' },
    photos: { url: '', state: 'default', status: 'not_tested' },
  },
});
assert.equal(connectionsWithEmptyUrls.sources.references.url, '', 'An unconfigured private source is represented as the contract’s empty string, not a fabricated link.');
assert.throws(
  () => normalizeConnectionSettings({ ...connections, sources: { ...connections.sources, photos: { ...connections.sources.photos, status: 'connected' } } }),
  /Invalid private connection settings/,
  'Unrecognized connection states are not rendered as successful private setup.'
);
assert.throws(
  () => normalizeConnectionSettings({ ...connections, revision: '0' }),
  /Invalid private connection settings/,
  'Connection revisions are safe integers, not opaque strings.'
);
assert.throws(
  () => normalizeConnectionSettings({ ...connections, revision: -1 }),
  /Invalid private connection settings/,
  'Negative connection revisions are rejected.'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeConnectionTest({ checkedAt: '2026-10-09T21:40:00Z', source: 'photos', status: 'ready' }, 'photos'))),
  { checkedAt: '2026-10-09T21:40:00Z', source: 'photos', status: 'ready' },
  'Only the fixed source name, ready status, and timestamp are accepted from a private test response.'
);
assert.throws(
  () => normalizeConnectionTest({ source: 'photos', status: 'saved' }, 'photos'),
  /Invalid private connection test/,
  'A test response cannot claim that a source was saved.'
);
assert.throws(
  () => normalizeConnectionTest({ source: 'photos', status: 'ready' }, 'photos'),
  /Invalid private connection test/,
  'A test response without its timestamp cannot be treated as a completed private check.'
);

const references = normalizeLiveReferences({
  references: [{
    referenceId: 'REF-TEST-001',
    name: 'Example reference',
    preferredName: '',
    workEmail: '',
    personalEmail: '',
    phone: '',
    linkedinUrl: '',
    sharedCompanies: 'Example Company',
    notes: '',
    introductionDraft: '',
    headsUpDraft: '',
    permission: 'Ask first',
  }]
});
assert.equal(references.length, 1, 'A valid owner-only references response replaces the sample contact state.');
assert.equal(references[0].referenceId, 'REF-TEST-001', 'The existing external reference ID is preserved rather than converted to a HUD contact ID.');
assert.equal(references[0].sharedCompanies, 'Example Company', 'The read-only references contract keeps sharedCompanies as a string.');
assert.throws(
  () => normalizeLiveReferences({ references: [{ ...references[0], permission: 'Unknown' }] }),
  /Invalid references payload/,
  'Unknown permission values cannot be rendered as private reference records.'
);
const referenceAtLimit = `{"references":[]}${' '.repeat(REFERENCES_MAX_BYTES - new TextEncoder().encode('{"references":[]}').byteLength)}`;
assert.deepEqual(
  JSON.parse(JSON.stringify(await readBoundedReferencesJson(new Response(referenceAtLimit, { headers: { 'Content-Length': String(REFERENCES_MAX_BYTES) } })))),
  { references: [] },
  'The browser accepts a complete references JSON response exactly at its byte limit.'
);
let chunkedReferencesCancelled = false;
const oversizedReferencesStream = new ReadableStream({
  cancel() { chunkedReferencesCancelled = true; },
  start(controller) {
    controller.enqueue(new Uint8Array(REFERENCES_MAX_BYTES));
    controller.enqueue(new Uint8Array(1));
  },
});
await assert.rejects(
  () => readBoundedReferencesJson(new Response(oversizedReferencesStream, { headers: { 'Content-Length': '1' } })),
  /too large/,
  'The browser counts actual references bytes when a declared length is wrong.'
);
assert.equal(chunkedReferencesCancelled, true, 'The browser cancels an oversized references stream before parsing or rendering it.');
await assert.rejects(
  () => readBoundedReferencesJson(new Response('x'.repeat(REFERENCES_MAX_BYTES + 1), { headers: { 'Content-Length': String(REFERENCES_MAX_BYTES + 1) } })),
  /too large/,
  'The browser rejects an oversized declared references response before parsing it.'
);
await assert.rejects(
  () => readBoundedReferencesJson(new Response(null)),
  /empty/,
  'The browser treats an empty references response as unavailable rather than partial data.'
);
const referenceRecord = index => ({
  referenceId: `REF-TEST-${index}`,
  name: 'Example reference',
  preferredName: '',
  workEmail: '',
  personalEmail: '',
  phone: '',
  linkedinUrl: '',
  sharedCompanies: '',
  notes: '',
  introductionDraft: '',
  headsUpDraft: '',
  permission: 'Ask first',
});
assert.equal(normalizeLiveReferences({ references: Array.from({ length: REFERENCES_MAX_RECORDS }, (_, index) => referenceRecord(index)) }).length, REFERENCES_MAX_RECORDS, 'The browser accepts the 999 data rows available below the References!A1:L1000 header.');
assert.throws(
  () => normalizeLiveReferences({ references: Array.from({ length: REFERENCES_MAX_RECORDS + 1 }, (_, index) => referenceRecord(index)) }),
  /Invalid references payload/,
  'The browser rejects more records than the protected References range can contain.'
);
const maximalReferenceRecord = index => ({
  referenceId: `REF-${String(index).padStart(3, '0')}${'a'.repeat(125)}`,
  name: 'n'.repeat(180),
  preferredName: 'p'.repeat(120),
  workEmail: 'w'.repeat(320),
  personalEmail: 'e'.repeat(320),
  phone: '1'.repeat(64),
  linkedinUrl: 'h'.repeat(2_048),
  sharedCompanies: 'c'.repeat(1_000),
  notes: 'n'.repeat(4_000),
  introductionDraft: 'i'.repeat(4_000),
  headsUpDraft: 'h'.repeat(4_000),
  permission: 'Ask first',
});
const sixteenRecordEnvelope = { references: Array.from({ length: 16 }, (_, index) => maximalReferenceRecord(index)) };
assert(new TextEncoder().encode(JSON.stringify(sixteenRecordEnvelope)).byteLength < REFERENCES_MAX_BYTES, 'The 2 MiB limit safely accommodates 16 records at the UI field limits without using private source values.');
assert.equal(trustedReferenceEmail('example.reference@example.invalid'), 'mailto:example.reference%40example.invalid', 'A valid reference email becomes a user-initiated mail link.');
assert.equal(trustedReferenceEmail('not an email'), null, 'Unsafe email text is not linked.');
assert.equal(trustedReferencePhone('+1 (555) 010-0123'), 'tel:+15550100123', 'A valid reference phone number becomes a user-initiated telephone link.');
assert.equal(trustedReferencePhone('javascript:alert(1)'), null, 'Unsafe phone text is not linked.');
assert.equal(trustedLinkedInUrl('https://www.linkedin.com/in/example-reference/'), 'https://www.linkedin.com/in/example-reference/', 'Only HTTPS LinkedIn profile links are rendered.');
assert.equal(trustedLinkedInUrl('https://example.invalid/reference'), null, 'Off-domain profile links are hidden.');

console.log('Career HUD opportunities UI: protected opportunities, reference records, safe reference links, follow-ups, and only the runtime Sheet link are rendered.');
