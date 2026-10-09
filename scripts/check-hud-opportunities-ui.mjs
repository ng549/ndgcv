import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('docs/hud/hud.js', 'utf8').replace(
  '\ninit();',
  '\nglobalThis.__hudTest = { trustedCareerSheetUrl, normalizeLiveOpportunities, normalizeLiveToday, normalizeLiveReferences, trustedReferenceEmail, trustedReferencePhone, trustedLinkedInUrl, localDateKey, mondayFor };'
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
  URL
};
vm.runInNewContext(source, context, { filename: 'docs/hud/hud.js' });
const { trustedCareerSheetUrl, normalizeLiveOpportunities, normalizeLiveToday, normalizeLiveReferences, trustedReferenceEmail, trustedReferencePhone, trustedLinkedInUrl, localDateKey, mondayFor } = context.globalThis.__hudTest;

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
assert.equal(trustedReferenceEmail('example.reference@example.invalid'), 'mailto:example.reference%40example.invalid', 'A valid reference email becomes a user-initiated mail link.');
assert.equal(trustedReferenceEmail('not an email'), null, 'Unsafe email text is not linked.');
assert.equal(trustedReferencePhone('+1 (555) 010-0123'), 'tel:+15550100123', 'A valid reference phone number becomes a user-initiated telephone link.');
assert.equal(trustedReferencePhone('javascript:alert(1)'), null, 'Unsafe phone text is not linked.');
assert.equal(trustedLinkedInUrl('https://www.linkedin.com/in/example-reference/'), 'https://www.linkedin.com/in/example-reference/', 'Only HTTPS LinkedIn profile links are rendered.');
assert.equal(trustedLinkedInUrl('https://example.invalid/reference'), null, 'Off-domain profile links are hidden.');

console.log('Career HUD opportunities UI: protected opportunities, reference records, safe reference links, follow-ups, and only the runtime Sheet link are rendered.');
