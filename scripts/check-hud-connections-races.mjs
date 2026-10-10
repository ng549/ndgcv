import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('docs/hud/hud.js', 'utf8').replace(
  '\ninit();',
  '\nglobalThis.__hudRaceTest = { applyOpportunityPayload, loadConnections, saveConnection, saveLiveOpportunity, state, testConnection, transitionConnectionSnapshot };'
);

function element() {
  const classes = new Set();
  return {
    addEventListener() {},
    classList: {
      add: value => classes.add(value),
      contains: value => classes.has(value),
      remove: value => classes.delete(value),
      toggle: (value, force) => {
        const enabled = force ?? !classes.has(value);
        if (enabled) classes.add(value);
        else classes.delete(value);
        return enabled;
      },
    },
    dataset: {},
    disabled: false,
    focus() {},
    hidden: false,
    innerHTML: '',
    options: [],
    removeAttribute() {},
    setAttribute() {},
    style: { setProperty() {} },
    textContent: '',
    value: '',
  };
}

function deferred() {
  let reject;
  let resolve;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function settings(revision, url) {
  return {
    revision,
    sources: {
      opportunities: { url, state: 'active', status: 'ready' },
      references: { url: `${url}/references`, state: 'active', status: 'ready' },
      photos: { url: `${url}/photos`, state: 'active', status: 'ready' },
    },
  };
}

function settingsWithSources(revision, { opportunities, photos, references }) {
  return {
    revision,
    sources: {
      opportunities: { url: opportunities, state: 'active', status: 'ready' },
      references: { url: references, state: 'active', status: 'ready' },
      photos: { url: photos, state: 'active', status: 'ready' },
    },
  };
}

function opportunityPayload(company) {
  return {
    links: {},
    revisions: { opp_runtime_001: 'a'.repeat(64) },
    today: [],
    values: [
      ['opportunity_id', 'company', 'title', 'location', 'work_arrangement', 'fit_rationale', 'status', 'next_action'],
      ['opp_runtime_001', company, 'Operating role', 'Remote', 'Hybrid', `${company} rationale`, 'research', `${company} next action`],
    ],
  };
}

function createRuntime(handler) {
  const elements = new Map();
  const getElement = selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const document = {
    addEventListener() {},
    documentElement: {
      dataset: {
        hudConnectionsEndpoint: '/api/hud/connections',
        hudOpportunitiesEndpoint: '/api/hud/opportunities',
        hudPhotoEndpoint: '/api/hud/photo',
        hudReferencesEndpoint: '/api/hud/references',
      },
    },
    querySelector: getElement,
    querySelectorAll: () => [],
  };
  const context = {
    AbortController,
    Array,
    Date,
    Headers,
    Intl,
    JSON,
    Map,
    Number,
    Object,
    Promise,
    RegExp,
    Response,
    Set,
    String,
    TextDecoder,
    TextEncoder,
    URL,
    Uint8Array,
    clearTimeout,
    console,
    crypto: { getRandomValues(values) { values.fill(1); return values; } },
    document,
    fetch: (...args) => handler(...args),
    globalThis: {},
    setTimeout,
    window: {
      location: { origin: 'https://nicolasgoureau.com' },
      setInterval() { return 0; },
      setTimeout,
    },
  };
  vm.runInNewContext(source, context, { filename: 'docs/hud/hud.js' });
  return { elements, hud: context.globalThis.__hudRaceTest };
}

function readyConnection(hud, sourceUrl = 'https://source-a.example') {
  Object.assign(hud.state.connections, {
    phase: 'ready',
    revision: 0,
    sources: settings(0, sourceUrl).sources,
  });
}

function response(status, body) {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });
}

const sanitizedHttp = createRuntime(() => response(502, {
  error: 'hud_backend_unavailable',
  detail: 'private upstream body must never reach the HUD',
  sourceUrl: 'https://private.example/should-not-render',
}));
await sanitizedHttp.hud.loadConnections();
assert.equal(sanitizedHttp.hud.state.connections.phase, 'unavailable', 'A settings 502 remains an unavailable state.');
assert.equal(sanitizedHttp.hud.state.connections.diagnostic?.errorCode, 'hud_backend_unavailable', 'Only an allowlisted backend code is retained for the diagnostic.');
assert.match(sanitizedHttp.elements.get('#connections-summary').textContent, /Diagnostic: HTTP 502 · JSON · hud_backend_unavailable\./, 'The HUD reports only status, content type classification, and allowlisted code.');
assert.doesNotMatch(sanitizedHttp.elements.get('#connections-summary').textContent, /private upstream|private\.example/, 'The HUD never renders a raw private backend body or source URL.');

const unsupportedContent = createRuntime(() => new Response('sensitive plaintext response', {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }, status: 503,
}));
await unsupportedContent.hud.loadConnections();
assert.match(unsupportedContent.elements.get('#connections-summary').textContent, /HTTP 503 · an unsupported content type\./, 'Non-JSON settings failures use a normalized content-type label.');
assert.doesNotMatch(unsupportedContent.elements.get('#connections-summary').textContent, /sensitive plaintext/, 'Unsupported response bytes are never exposed.');

const protectedAccess = createRuntime(() => response(403, { error: 'hud_access_required', secret: 'never display' }));
await protectedAccess.hud.loadConnections();
assert.equal(protectedAccess.hud.state.connections.phase, 'access', 'A settings 403 retains its private access state.');
assert.equal(protectedAccess.hud.state.connections.diagnostic, null, 'A settings 403 clears rather than surfaces a diagnostic.');
assert.doesNotMatch(protectedAccess.elements.get('#connections-summary').textContent, /Diagnostic:|hud_access_required|never display/, 'Private access concealment never exposes status details or body content.');

const blockedNetwork = createRuntime(() => { throw new Error('sensitive transport detail'); });
await blockedNetwork.hud.loadConnections();
assert.match(blockedNetwork.elements.get('#connections-summary').textContent, /network or redirect blocked/, 'A failed request has a generic network diagnostic.');
assert.doesNotMatch(blockedNetwork.elements.get('#connections-summary').textContent, /sensitive transport detail/, 'Network exception text is never exposed.');

const delayedFirstTest = deferred();
const concurrentTestCalls = [];
const twoTests = createRuntime((input, init) => {
  const url = new URL(input);
  concurrentTestCalls.push(`${init?.method || 'GET'} ${url.pathname}`);
  if (url.pathname === '/api/hud/connections/opportunities/test' && init?.method === 'POST') return delayedFirstTest.promise;
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
readyConnection(twoTests.hud);
const firstTest = twoTests.hud.testConnection('opportunities');
const testingMarkup = twoTests.elements.get('#connections-list').innerHTML;
assert.match(testingMarkup, /data-test-connection="references" disabled/, 'A pending Test disables Test controls on every card.');
assert.match(testingMarkup, /data-save-connection="references" disabled/, 'A pending Test disables Connect controls on every card.');
await twoTests.hud.testConnection('references');
assert.deepEqual(concurrentTestCalls, ['POST /api/hud/connections/opportunities/test'], 'A second Test cannot begin while another private connection operation is in flight.');
assert.equal(twoTests.hud.state.connections.tests.get('opportunities')?.phase, 'testing', 'The first Test remains the only active card operation.');
delayedFirstTest.resolve(response(403, { error: 'hud_access_required' }));
await firstTest;
assert.equal(twoTests.hud.state.connections.phase, 'access', 'A same-session Test 403 conceals every connection after a blocked concurrent Test click.');
assert.equal(twoTests.hud.state.connections.sources, null, 'A Test 403 leaves no private URLs in memory.');
assert.equal(twoTests.hud.state.connections.activeRequest, null, 'A Test 403 releases the serialized operation lock.');

const delayedPut = deferred();
const putWithTestAttemptCalls = [];
const putWithTestAttempt = createRuntime((input, init) => {
  const url = new URL(input);
  putWithTestAttemptCalls.push(`${init?.method || 'GET'} ${url.pathname}`);
  if (url.pathname === '/api/hud/connections/opportunities' && init?.method === 'PUT') return delayedPut.promise;
  if (['/api/hud/opportunities', '/api/hud/references', '/api/hud/photo'].includes(url.pathname)) return response(409, { error: 'hud_not_connected' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
readyConnection(putWithTestAttempt.hud);
putWithTestAttempt.hud.state.connections.drafts.set('opportunities', 'https://source-b.example');
putWithTestAttempt.hud.state.connections.tests.set('opportunities', { phase: 'ready' });
const pendingPut = putWithTestAttempt.hud.saveConnection('opportunities');
const savingMarkup = putWithTestAttempt.elements.get('#connections-list').innerHTML;
assert.match(savingMarkup, /data-test-connection="references" disabled/, 'A pending Connect disables Test controls on every card.');
assert.match(savingMarkup, /data-save-connection="references" disabled/, 'A pending Connect disables Connect controls on every card.');
await putWithTestAttempt.hud.testConnection('references');
assert.deepEqual(putWithTestAttemptCalls, ['PUT /api/hud/connections/opportunities'], 'A Test cannot supersede an in-flight Connect request.');
assert.equal(putWithTestAttempt.hud.state.connections.tests.get('opportunities')?.phase, 'saving', 'A blocked Test attempt cannot strand or replace the pending Connect state.');
delayedPut.resolve(response(200, settings(1, 'https://source-b.example')));
await pendingPut;
assert.equal(putWithTestAttempt.hud.state.connections.phase, 'ready', 'A successful Connect remains applied after a blocked concurrent Test attempt.');
assert.equal(putWithTestAttempt.hud.state.connections.tests.get('opportunities')?.phase, 'saved', 'A successful Connect clears its saving state after the serialized operation completes.');
assert.equal(putWithTestAttempt.hud.state.connections.activeRequest, null, 'A successful Connect releases the serialized operation lock.');

const recoveryCalls = [];
const lostPut = createRuntime((input, init) => {
  const url = new URL(input);
  recoveryCalls.push(`${init?.method || 'GET'} ${url.pathname}`);
  if (url.pathname === '/api/hud/connections/opportunities' && init?.method === 'PUT') return response(502, { error: 'hud_source_unavailable' });
  if (url.pathname === '/api/hud/connections') return response(200, settings(1, 'https://source-b.example'));
  if (['/api/hud/opportunities', '/api/hud/references', '/api/hud/photo'].includes(url.pathname)) return response(409, { error: 'hud_not_connected' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
readyConnection(lostPut.hud);
lostPut.hud.state.liveDrafts.set('opp_runtime_001', { nextAction: 'Old A draft', status: 'research' });
lostPut.hud.state.connections.drafts.set('opportunities', 'https://source-b.example');
lostPut.hud.state.connections.tests.set('opportunities', { phase: 'ready' });
await lostPut.hud.saveConnection('opportunities');
assert.equal(lostPut.hud.state.connections.revision, 1, 'A reconciliation snapshot advances to its returned revision.');
assert.equal(lostPut.hud.state.liveDrafts.size, 0, 'A changed source snapshot invalidates live drafts before reloading.');
assert.equal(lostPut.hud.state.liveOpportunities, false, 'A changed source snapshot clears old live opportunities before reload.');
assert.deepEqual(
  recoveryCalls.filter(call => call.startsWith('GET /api/hud/')).sort(),
  ['GET /api/hud/connections', 'GET /api/hud/opportunities', 'GET /api/hud/photo', 'GET /api/hud/references'],
  'A changed reconciliation snapshot reloads every changed protected source exactly once.'
);

const failedRecheck = createRuntime((input, init) => {
  const url = new URL(input);
  if (url.pathname === '/api/hud/connections/opportunities' && init?.method === 'PUT') return response(502, { error: 'hud_source_unavailable' });
  if (url.pathname === '/api/hud/connections') throw new Error('recheck unavailable');
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
readyConnection(failedRecheck.hud);
failedRecheck.hud.state.connections.drafts.set('opportunities', 'https://source-b.example');
failedRecheck.hud.state.connections.tests.set('opportunities', { phase: 'ready' });
await failedRecheck.hud.saveConnection('opportunities');
assert.equal(failedRecheck.hud.state.connections.phase, 'unknown', 'A failed save reconciliation has an explicit unknown outcome, not a false unchanged claim.');
assert.equal(failedRecheck.hud.state.connections.sources, null, 'Unknown save outcomes keep private source URLs concealed.');
assert.equal(failedRecheck.hud.state.connections.drafts.get('opportunities'), 'https://source-b.example', 'Unknown save outcomes preserve the in-memory draft.');

const patchSuccess = deferred();
const patchCalls = [];
const patchAfterActivation = createRuntime((input, init) => {
  const url = new URL(input);
  patchCalls.push(`${init?.method || 'GET'} ${url.pathname}`);
  if (url.pathname === '/api/hud/opportunities/opp_runtime_001' && init?.method === 'PATCH') return patchSuccess.promise;
  if (['/api/hud/opportunities', '/api/hud/references', '/api/hud/photo'].includes(url.pathname)) return response(409, { error: 'hud_not_connected' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
patchAfterActivation.hud.applyOpportunityPayload(opportunityPayload('Source A'));
readyConnection(patchAfterActivation.hud);
const form = { elements: { nextAction: { value: 'Source A pending action' }, status: { value: 'research' } } };
const oldPatch = patchAfterActivation.hud.saveLiveOpportunity('opp_runtime_001', form);
await patchAfterActivation.hud.transitionConnectionSnapshot(settings(1, 'https://source-b.example'));
patchSuccess.resolve(response(200, opportunityPayload('Source A response')));
await oldPatch;
assert.equal(patchAfterActivation.hud.state.liveOpportunities, false, 'A PATCH response from source A cannot restore a live view after source B activation.');
assert.equal(patchAfterActivation.hud.state.liveSaves.size, 0, 'A PATCH response from source A cannot mark an old record saved after source B activation.');
assert.equal(patchAfterActivation.hud.state.opportunities.some(opportunity => opportunity.company === 'Source A response'), false, 'A PATCH body from source A cannot replace source B state.');

const patchFailure = deferred();
let recoveryOpportunityReads = 0;
const recoveryAfterActivation = createRuntime((input, init) => {
  const url = new URL(input);
  if (url.pathname === '/api/hud/opportunities/opp_runtime_001' && init?.method === 'PATCH') return patchFailure.promise;
  if (url.pathname === '/api/hud/opportunities') {
    recoveryOpportunityReads += 1;
    return response(409, { error: 'hud_not_connected' });
  }
  if (['/api/hud/references', '/api/hud/photo'].includes(url.pathname)) return response(409, { error: 'hud_not_connected' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
recoveryAfterActivation.hud.applyOpportunityPayload(opportunityPayload('Source A'));
readyConnection(recoveryAfterActivation.hud);
const lostPatch = recoveryAfterActivation.hud.saveLiveOpportunity('opp_runtime_001', form);
await recoveryAfterActivation.hud.transitionConnectionSnapshot(settings(1, 'https://source-b.example'));
const readsAfterActivation = recoveryOpportunityReads;
patchFailure.resolve(response(502, { error: 'hud_source_unavailable' }));
await lostPatch;
assert.equal(recoveryOpportunityReads, readsAfterActivation, 'A failed PATCH from source A cannot start a recovery GET against source B.');
assert.equal(recoveryAfterActivation.hud.state.liveSaves.size, 0, 'A failed PATCH from source A cannot add a retry/save status after source B activation.');

const globalRevisionPatch = deferred();
const globalRevisionCalls = [];
const globalRevisionActivation = createRuntime((input, init) => {
  const url = new URL(input);
  globalRevisionCalls.push(`${init?.method || 'GET'} ${url.pathname}`);
  if (url.pathname === '/api/hud/opportunities/opp_runtime_001' && init?.method === 'PATCH') return globalRevisionPatch.promise;
  if (url.pathname === '/api/hud/opportunities' || url.pathname === '/api/hud/references') return response(409, { error: 'hud_not_connected' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
globalRevisionActivation.hud.applyOpportunityPayload(opportunityPayload('Source A'));
readyConnection(globalRevisionActivation.hud);
globalRevisionActivation.hud.state.liveDrafts.set('opp_runtime_001', { nextAction: 'A stale draft', status: 'research' });
globalRevisionActivation.hud.state.liveSaves.set('opp_runtime_001', { command: { actionId: 'stale-retry-token' }, phase: 'uncertain' });
const staleGlobalRevisionPatch = globalRevisionActivation.hud.saveLiveOpportunity('opp_runtime_001', form);
await globalRevisionActivation.hud.transitionConnectionSnapshot(settingsWithSources(1, {
  opportunities: 'https://source-a.example',
  references: 'https://references-b.example',
  photos: 'https://source-a.example/photos',
}));
assert.equal(globalRevisionActivation.hud.state.liveOpportunities, false, 'A global connection revision advance invalidates opportunity rows even when their source URL is unchanged.');
assert.equal(globalRevisionActivation.hud.state.liveDrafts.size, 0, 'A global connection revision advance clears stale opportunity drafts.');
assert.equal(globalRevisionActivation.hud.state.liveSaves.size, 0, 'A global connection revision advance clears stale opportunity retry tokens.');
assert.deepEqual(
  globalRevisionCalls.filter(call => call.startsWith('GET /api/hud/')).sort(),
  ['GET /api/hud/opportunities', 'GET /api/hud/references'],
  'A references activation reloads opportunities once because the global revision changes, plus the changed references source.'
);
globalRevisionPatch.resolve(response(200, opportunityPayload('Source A stale response')));
await staleGlobalRevisionPatch;
assert.equal(globalRevisionActivation.hud.state.liveSaves.size, 0, 'A stale PATCH cannot reintroduce a save outcome after a global revision change.');
assert.equal(globalRevisionActivation.hud.state.opportunities.some(opportunity => opportunity.company === 'Source A stale response'), false, 'A stale PATCH cannot restore opportunity rows after an unrelated source activation advances their revision.');

console.log('Career HUD connections races: serialized cross-card operations, deferred GET/PUT/PATCH responses, global-revision source transitions, and unknown save reconciliation verified.');
