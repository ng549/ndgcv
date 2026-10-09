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

const delayedGet = deferred();
const getAfter403 = createRuntime((input, init) => {
  const url = new URL(input);
  if (url.pathname === '/api/hud/connections' && init?.method !== 'POST') return delayedGet.promise;
  if (url.pathname === '/api/hud/connections/opportunities/test') return response(403, { error: 'hud_access_required' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
readyConnection(getAfter403.hud);
const staleGet = getAfter403.hud.loadConnections();
await getAfter403.hud.testConnection('opportunities');
delayedGet.resolve(response(200, settings(1, 'https://stale.example')));
await staleGet;
assert.equal(getAfter403.hud.state.connections.phase, 'access', 'A delayed settings GET cannot restore ready state after a newer 403.');
assert.equal(getAfter403.hud.state.connections.sources, null, 'A delayed settings GET cannot restore private URLs after a newer 403.');

const delayedPut = deferred();
let putPhase = 'put';
const putAfter403 = createRuntime((input, init) => {
  const url = new URL(input);
  if (url.pathname === '/api/hud/connections/opportunities' && init?.method === 'PUT') return delayedPut.promise;
  if (url.pathname === '/api/hud/connections' && (init?.method ?? 'GET') === 'GET' && putPhase === 'access') return response(403, { error: 'hud_access_required' });
  throw new Error(`Unexpected request ${init?.method} ${url.pathname}`);
});
readyConnection(putAfter403.hud);
putAfter403.hud.state.connections.drafts.set('opportunities', 'https://source-b.example');
putAfter403.hud.state.connections.tests.set('opportunities', { phase: 'ready' });
const stalePut = putAfter403.hud.saveConnection('opportunities');
putPhase = 'access';
await putAfter403.hud.loadConnections();
delayedPut.resolve(response(200, settings(1, 'https://source-b.example')));
await stalePut;
assert.equal(putAfter403.hud.state.connections.phase, 'access', 'A delayed successful PUT cannot restore ready state after a newer 403.');
assert.equal(putAfter403.hud.state.connections.sources, null, 'A delayed successful PUT cannot restore private URLs after a newer 403.');

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

console.log('Career HUD connections races: deferred GET/PUT/PATCH responses, unknown save reconciliation, and source transitions verified.');
