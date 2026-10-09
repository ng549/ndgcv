import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import worker, { HUD_REFERENCES_MAX_BYTES, proxyHudOpportunities, proxyHudReferences } from '../worker/index.js';
import { isHudEncodedAlias, requireHudAccess, resetHudAccessKeyCacheForTests } from '../worker/hud-access.mjs';

const issuer = 'https://career-hud-test.cloudflareaccess.com';
const audience = 'career-hud-test-audience';
const ownerEmail = 'owner@example.com';
const canonicalHost = 'nicolasgoureau.com';
const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
Object.assign(publicJwk, { alg: 'RS256', kid: 'career-hud-test-key', use: 'sig' });

const env = Object.freeze({
  HUD_ACCESS_AUD: audience,
  HUD_ACCESS_TEAM_DOMAIN: issuer,
  HUD_CANONICAL_HOST: canonicalHost,
  HUD_OWNER_EMAIL: ownerEmail,
});

async function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: [audience],
    email: ownerEmail,
    exp: now + 300,
    iat: now - 5,
    iss: issuer,
    nbf: now - 5,
    sub: 'test-owner',
    type: 'app',
    ...overrides,
  };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid, typ: 'JWT' })
    .sign(privateKey);
}

async function withAccessJwks(run, upstreamFetch) {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input, init) => {
    requests += 1;
    if (String(input) === `${issuer}/cdn-cgi/access/certs`) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    assert(upstreamFetch, `Unexpected network request: ${input}`);
    return upstreamFetch(input, init);
  };
  resetHudAccessKeyCacheForTests();
  try {
    return await run(() => requests);
  } finally {
    resetHudAccessKeyCacheForTests();
    globalThis.fetch = originalFetch;
  }
}

function request(path = '/hud/', options = {}) {
  const host = options.host || canonicalHost;
  const headers = new Headers(options.headers);
  if (options.token) headers.set('cf-access-jwt-assertion', options.token);
  const init = { headers, method: options.method };
  if (options.body !== undefined) init.body = options.body;
  return new Request(`https://${host}${path}`, init);
}

function assertNoStore(denial, message) {
  assert.match(denial.headers.get('Cache-Control'), /no-store/, message);
  assert.equal(denial.headers.get('X-Content-Type-Options'), 'nosniff', message);
}

assert(isHudEncodedAlias('/hud%2Fhud.js'));
assert(isHudEncodedAlias('/%68ud/'));
assert(isHudEncodedAlias('/api/hud%2Fopportunities'));
assert(isHudEncodedAlias('/%2568ud/'));
assert(!isHudEncodedAlias('/assets/hud%20notes.txt'));

let response = await requireHudAccess(request(), {});
assert.equal(response.status, 503, 'HUD fails closed when Access configuration is missing');
assertNoStore(response, 'Configuration denial is never cacheable.');

await withAccessJwks(async fetchCount => {
  response = await requireHudAccess(request('/hud/', { host: 'www.nicolasgoureau.com' }), env);
  assert.equal(response.status, 404, 'HUD rejects alternate hosts before token lookup');
  assertNoStore(response, 'Alternate-host denial is never cacheable.');
  assert.equal(fetchCount(), 0);

  response = await requireHudAccess(request(), env);
  assert.equal(response.status, 403, 'HUD rejects a request without the Access JWT');
  assertNoStore(response, 'Missing-token denial is never cacheable.');
  assert.equal(fetchCount(), 0);

  response = await requireHudAccess(request('/hud/', { method: 'HEAD' }), env);
  assert.equal(response.status, 403, 'HUD protects HEAD requests too');
  assertNoStore(response, 'HEAD denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', {
    headers: { 'cf-access-authenticated-user-email': ownerEmail },
  }), env);
  assert.equal(response.status, 403, 'HUD never trusts a raw identity header without a signed JWT');
  assertNoStore(response, 'Raw-header denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', { token: await token({ email: 'other@example.com' }) }), env);
  assert.equal(response.status, 403, 'HUD rejects a signed token for another user');
  assertNoStore(response, 'Wrong-owner denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', { token: await token({ aud: ['other-audience'] }) }), env);
  assert.equal(response.status, 403, 'HUD rejects a signed token for another Access application');
  assertNoStore(response, 'Wrong-audience denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', { token: await token({ iss: 'https://other.cloudflareaccess.com' }) }), env);
  assert.equal(response.status, 403, 'HUD rejects a signed token from another Access issuer');
  assertNoStore(response, 'Wrong-issuer denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', { token: await token({ exp: Math.floor(Date.now() / 1000) - 120 }) }), env);
  assert.equal(response.status, 403, 'HUD rejects an expired token');
  assertNoStore(response, 'Expired-token denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', { token: await token({ type: 'org' }) }), env);
  assert.equal(response.status, 403, 'HUD rejects a non-application Access token');
  assertNoStore(response, 'Wrong-token-type denial is never cacheable.');

  const validToken = await token();
  const [header, payload, signature] = validToken.split('.');
  const tamperedSignature = `${signature.startsWith('a') ? 'b' : 'a'}${signature.slice(1)}`;
  const tamperedToken = `${header}.${payload}.${tamperedSignature}`;
  response = await requireHudAccess(request('/hud/', { token: tamperedToken }), env);
  assert.equal(response.status, 403, 'HUD rejects a token with an invalid signature');
  assertNoStore(response, 'Invalid-signature denial is never cacheable.');

  response = await requireHudAccess(request('/hud/', { token: validToken }), env);
  assert.equal(response, null, 'HUD accepts only a valid signed owner application token');
  assert(fetchCount() >= 1, 'HUD retrieves the configured Access JWKS');
});

let assetCalls = 0;
const workerEnv = {
  ASSETS: { fetch: async () => { assetCalls += 1; return new Response('public asset'); } },
};
response = await worker.fetch(request('/hud/'), workerEnv);
assert.equal(response.status, 503, 'Worker does not serve HUD assets without Access metadata');
assert.equal(assetCalls, 0);
assertNoStore(response, 'Worker configuration denial is never cacheable.');
for (const alias of ['/hud%2Fhud.js', '/%68ud/', '/api/hud%2Fopportunities']) {
  response = await worker.fetch(request(alias), workerEnv);
  assert.equal(response.status, 404, `Worker rejects encoded HUD alias ${alias} before asset dispatch`);
  assertNoStore(response, `Encoded HUD alias ${alias} is never cacheable.`);
  assert.equal(assetCalls, 0);
}
response = await worker.fetch(request('/'), workerEnv);
assert.equal(response.status, 200, 'Worker preserves the public site');
assert.equal(assetCalls, 1);
response = await worker.fetch(request('/api/hud/'), workerEnv);
assert.equal(response.status, 503, 'Future HUD API fails closed before it exists');
assertNoStore(response, 'Future API configuration denial is never cacheable.');
let appCalls = 0;
response = await worker.fetch(request('/apps/restoreflow/example'), {
  ...workerEnv,
  RESTOREFLOW: { fetch: async () => { appCalls += 1; return new Response('app proxy'); } },
});
assert.equal(response.status, 200, 'HUD middleware leaves Apps proxy routes available.');
assert.equal(appCalls, 1, 'Apps proxy binding receives its request.');

const backendOrigin = 'https://agency-nexus-command.fly.dev';
const backendCalls = [];
let backendResponse = () => new Response(JSON.stringify({ values: [], today: [], revisions: {}, links: {} }), {
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' },
  status: 200,
});

await withAccessJwks(async () => {
  let protectedAssetCalls = 0;
  const protectedEnv = {
    ...env,
    HUD_BACKEND_ORIGIN: backendOrigin,
    ASSETS: {
      fetch: async () => {
        protectedAssetCalls += 1;
        return new Response('protected HUD asset', { headers: { 'Cache-Control': 'public, max-age=3600' } });
      },
    },
  };
  response = await worker.fetch(request('/hud/', { token: await token() }), protectedEnv);
  assert.equal(response.status, 200, 'Valid owner JWT reaches the HUD asset handler');
  assert.match(response.headers.get('Cache-Control'), /no-store/, 'HUD asset responses are never publicly cached');
  assert.equal(protectedAssetCalls, 1);
  response = await worker.fetch(request('/api/hud/', { token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'Future HUD API remains unavailable even to the owner');
  assertNoStore(response, 'Future API response is never cacheable.');

  const ownerAssertion = await token();
  response = await worker.fetch(request('/api/hud/opportunities', {
    headers: { Cookie: 'untrusted=browser-cookie' },
    token: ownerAssertion,
  }), protectedEnv);
  assert.equal(response.status, 200, 'The owner may read the one proxied opportunities endpoint.');
  assertNoStore(response, 'Proxied opportunities are never cacheable.');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'The proxy does not add or relay CORS headers.');
  assert.equal(backendCalls.length, 1, 'The protected request reaches the fixed backend once.');
  assert.equal(String(backendCalls[0].input), `${backendOrigin}/api/hud/opportunities`, 'The proxy cannot use a caller-selected backend path.');
  assert.equal(backendCalls[0].init.method, 'GET', 'The proxy permits only a GET read.');
  assert.equal(new Headers(backendCalls[0].init.headers).get('Accept'), 'application/json');
  assert.equal(new Headers(backendCalls[0].init.headers).get('cf-access-jwt-assertion'), ownerAssertion, 'The existing owner assertion is forwarded to the backend.');
  assert.equal(new Headers(backendCalls[0].init.headers).get('Cookie'), null, 'Browser cookies are never forwarded to the backend.');

  backendResponse = () => new Response('jpeg', {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'image/jpeg' },
    status: 200,
  });
  response = await worker.fetch(request('/api/hud/photo', { token: await token() }), protectedEnv);
  assert.equal(response.status, 200, 'The owner may load only the fixed protected photo route.');
  assert.equal(response.headers.get('Content-Type'), 'image/jpeg', 'The proxy preserves only the upstream JPEG type.');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'The photo proxy does not add or relay CORS headers.');
  assert.equal(String(backendCalls[1].input), `${backendOrigin}/api/hud/photo`, 'The photo proxy cannot use a caller-selected source.');
  assert.equal(backendCalls[1].init.method, 'GET', 'The photo proxy permits only a GET read.');
  assert.equal(new Headers(backendCalls[1].init.headers).get('Accept'), 'image/jpeg', 'The photo proxy requests only JPEG bytes.');
  response = await worker.fetch(request('/api/hud/photo?fileId=attacker', { token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'A photo query cannot select a private Drive file.');
  assert.equal(backendCalls.length, 2, 'A rejected photo query never reaches the backend.');

  const patchPath = '/api/hud/opportunities/opp_sheet001';
  const patch = JSON.stringify({
    actionId: 'action_update001',
    expectedRevision: 'a'.repeat(64),
    nextAction: 'Send a focused follow-up',
    status: 'conversation',
  });
  backendResponse = () => new Response(JSON.stringify({ values: [], today: [], revisions: { opp_sheet001: 'b'.repeat(64) }, revision: 'b'.repeat(64), replayed: false, links: {} }), {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' },
    status: 200,
  });
  response = await worker.fetch(request(patchPath, {
    body: patch,
    headers: { 'Content-Type': 'application/json', Cookie: 'untrusted=browser-cookie', Origin: `https://${canonicalHost}` },
    method: 'PATCH',
    token: ownerAssertion,
  }), protectedEnv);
  assert.equal(response.status, 200, 'The owner may save the two approved opportunity fields.');
  assertNoStore(response, 'Proxied opportunity saves are never cacheable.');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'The save proxy does not add or relay CORS headers.');
  assert.equal(String(backendCalls[2].input), `${backendOrigin}${patchPath}`, 'The save proxy uses only the stable opportunity path.');
  assert.equal(backendCalls[2].init.method, 'PATCH', 'The save proxy permits only PATCH for the stable opportunity route.');
  assert.equal(new Headers(backendCalls[2].init.headers).get('Accept'), 'application/json');
  assert.equal(new Headers(backendCalls[2].init.headers).get('Content-Type'), 'application/json');
  assert.equal(new Headers(backendCalls[2].init.headers).get('Cookie'), null, 'Browser cookies are never forwarded on save.');
  assert.equal(new Headers(backendCalls[2].init.headers).get('cf-access-jwt-assertion'), ownerAssertion, 'The verified owner assertion is forwarded on save.');
  assert.deepEqual(JSON.parse(new TextDecoder().decode(backendCalls[2].init.body)), JSON.parse(patch), 'The proxy preserves the bounded JSON command for the fixed backend route.');

  const blockedWrite = async (options, message) => {
    response = await worker.fetch(request(patchPath, {
      body: patch,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      method: 'PATCH',
      token: await token(),
    }), protectedEnv);
    assert.equal(response.status, 400, message);
    assertNoStore(response, message);
    assert.equal(backendCalls.length, 3, `${message} does not reach the backend.`);
  };
  await blockedWrite({}, 'A save without same-origin proof is rejected.');
  await blockedWrite({ headers: { Origin: 'https://attacker.invalid' } }, 'A cross-origin save is rejected.');
  await blockedWrite({ headers: { 'Content-Type': 'text/plain', Origin: `https://${canonicalHost}` } }, 'A non-JSON save is rejected.');
  response = await worker.fetch(request(patchPath, {
    body: JSON.stringify({ padding: 'x'.repeat(16 * 1024) }),
    headers: { 'Content-Type': 'application/json', Origin: `https://${canonicalHost}` },
    method: 'PATCH',
    token: await token(),
  }), protectedEnv);
  assert.equal(response.status, 400, 'An oversized save is rejected before the backend.');
  assert.equal(backendCalls.length, 3, 'An oversized save never reaches the backend.');
  let chunkedSaveCancelled = false;
  const chunkedSave = new ReadableStream({
    cancel() { chunkedSaveCancelled = true; },
    start(controller) {
      controller.enqueue(new Uint8Array(8 * 1024));
      controller.enqueue(new Uint8Array((8 * 1024) + 1));
    },
  });
  response = await worker.fetch(new Request(`https://${canonicalHost}${patchPath}`, {
    body: chunkedSave,
    duplex: 'half',
    headers: {
      'cf-access-jwt-assertion': await token(),
      'Content-Type': 'application/json',
      Origin: `https://${canonicalHost}`,
    },
    method: 'PATCH',
  }), protectedEnv);
  assert.equal(response.status, 400, 'An oversized chunked save is rejected before the backend.');
  assert.equal(chunkedSaveCancelled, true, 'An oversized chunked save is cancelled without buffering the remaining stream.');
  assert.equal(backendCalls.length, 3, 'An oversized chunked save never reaches the backend.');
  response = await worker.fetch(request(`${patchPath}?retry=attacker`, {
    body: patch,
    headers: { 'Content-Type': 'application/json', Origin: `https://${canonicalHost}` },
    method: 'PATCH',
    token: await token(),
  }), protectedEnv);
  assert.equal(response.status, 404, 'A save query cannot alter the fixed backend route.');
  assert.equal(backendCalls.length, 3, 'A queried save never reaches the backend.');

  backendResponse = () => new Response(JSON.stringify({ error: 'hud_conflict' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  response = await worker.fetch(request(patchPath, {
    body: patch,
    headers: { 'Content-Type': 'application/json', Origin: `https://${canonicalHost}` },
    method: 'PATCH',
    token: await token(),
  }), protectedEnv);
  assert.equal(response.status, 409, 'A backend revision conflict remains visible to the owner.');
  assert.equal(backendCalls.length, 4, 'A valid same-origin save reaches the backend once.');

  response = await worker.fetch(request('/api/hud/opportunities', { method: 'PATCH', token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'The same-origin proxy does not expose backend writes.');
  assertNoStore(response, 'Unsupported proxy methods are never cacheable.');
  assert.equal(backendCalls.length, 4, 'Unsupported methods never reach the backend.');

  response = await worker.fetch(request('/api/hud/opportunities', { token: await token() }), { ...protectedEnv, HUD_BACKEND_ORIGIN: undefined });
  assert.equal(response.status, 409, 'An owner sees an honest unconnected state when the backend origin is absent.');
  assertNoStore(response, 'A missing backend origin is never cacheable.');
  assert.equal(backendCalls.length, 4, 'A missing backend origin makes no backend request.');

  response = await worker.fetch(request(patchPath, {
    body: patch,
    headers: { 'Content-Type': 'application/json', Origin: `https://${canonicalHost}` },
    method: 'PATCH',
    token: await token(),
  }), { ...protectedEnv, HUD_BACKEND_ORIGIN: undefined });
  assert.equal(response.status, 409, 'A missing backend origin keeps an owner save truthful.');
  assert.equal(backendCalls.length, 4, 'An unconnected save makes no backend request.');

  response = await proxyHudOpportunities(request('/api/hud/opportunities', { token: ownerAssertion }), { HUD_BACKEND_ORIGIN: 'https://example.invalid' }, async () => {
    assert.fail('An invalid backend origin must not be fetched.');
  });
  assert.equal(response.status, 409, 'An untrusted backend origin fails closed.');

  backendResponse = () => new Response(JSON.stringify({ error: 'hud_source_unavailable' }), { status: 502 });
  response = await worker.fetch(request('/api/hud/opportunities', { token: await token() }), protectedEnv);
  assert.equal(response.status, 502, 'An upstream source error remains an honest unavailable state.');
  assertNoStore(response, 'Upstream failures are never cacheable.');

  response = await proxyHudOpportunities(request('/api/hud/opportunities', { token: ownerAssertion }), { HUD_BACKEND_ORIGIN: backendOrigin }, async () => {
    throw new Error('backend offline');
  });
  assert.equal(response.status, 502, 'A network failure becomes an honest unavailable state.');
  assertNoStore(response, 'Network failures are never cacheable.');

  backendResponse = () => new Response(JSON.stringify({ references: [] }), {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' },
    status: 200,
  });
  const referenceCallsBefore = backendCalls.length;
  response = await worker.fetch(request('/api/hud/references', {
    headers: { Cookie: 'untrusted=browser-cookie' },
    token: ownerAssertion,
  }), protectedEnv);
  assert.equal(response.status, 200, 'The owner may read the one fixed references endpoint.');
  assertNoStore(response, 'Proxied references are never cacheable.');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'The references proxy does not add or relay CORS headers.');
  assert.equal(backendCalls.length, referenceCallsBefore + 1, 'The protected references request reaches the backend once.');
  const referenceCall = backendCalls.at(-1);
  assert.equal(String(referenceCall.input), `${backendOrigin}/api/hud/references`, 'The references proxy cannot use a caller-selected backend path.');
  assert.equal(referenceCall.init.method, 'GET', 'The references proxy permits only a GET read.');
  assert.equal(new Headers(referenceCall.init.headers).get('Accept'), 'application/json');
  assert.equal(new Headers(referenceCall.init.headers).get('cf-access-jwt-assertion'), ownerAssertion, 'The existing owner assertion is forwarded to the references backend.');
  assert.equal(new Headers(referenceCall.init.headers).get('Cookie'), null, 'Browser cookies are never forwarded to the references backend.');

  const referencesRequest = request('/api/hud/references', { token: ownerAssertion });
  const proxyReferenceBody = async (body, headers = {}) => proxyHudReferences(
    referencesRequest,
    { HUD_BACKEND_ORIGIN: backendOrigin },
    async () => new Response(body, { headers, status: 200 })
  );
  response = await proxyReferenceBody('{"references":[]}');
  assert.equal(response.status, 200, 'A normal private references JSON response is proxied after buffering.');
  assert.equal(await response.text(), '{"references":[]}', 'The buffered normal references response remains complete.');

  response = await proxyReferenceBody(null, { 'Content-Type': 'application/json' });
  assert.equal(response.status, 200, 'An empty upstream references response is forwarded without inventing data.');
  assert.equal(await response.text(), '', 'An empty references response contains no partial data.');

  const boundaryBody = `{"references":[]}${' '.repeat(HUD_REFERENCES_MAX_BYTES - new TextEncoder().encode('{"references":[]}').byteLength)}`;
  response = await proxyReferenceBody(boundaryBody, { 'Content-Length': String(HUD_REFERENCES_MAX_BYTES) });
  assert.equal(response.status, 200, 'A references response exactly at the byte limit is accepted.');
  assert.equal((await response.arrayBuffer()).byteLength, HUD_REFERENCES_MAX_BYTES, 'The exact-limit references response is preserved in full.');

  const oversizedReferences = async (declaredLength, message) => {
    let cancelled = false;
    const stream = new ReadableStream({
      cancel() { cancelled = true; },
      start(controller) {
        controller.enqueue(new Uint8Array(HUD_REFERENCES_MAX_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
    });
    const headers = declaredLength === null ? {} : { 'Content-Length': declaredLength };
    response = await proxyReferenceBody(stream, headers);
    assert.equal(response.status, 502, message);
    assertNoStore(response, message);
    assert.equal(cancelled, true, `${message} cancels the upstream stream without exposing partial contacts.`);
  };
  await oversizedReferences(String(HUD_REFERENCES_MAX_BYTES + 1), 'An oversized declared references response is rejected before forwarding.');
  await oversizedReferences(null, 'An oversized chunked references response is counted and rejected without a declared length.');
  await oversizedReferences('1', 'An oversized references response is counted and rejected when its declared length is wrong.');

  response = await worker.fetch(request('/api/hud/references?range=attacker', { token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'A references query cannot select a private range.');
  assert.equal(backendCalls.length, referenceCallsBefore + 1, 'A rejected references query never reaches the backend.');
  response = await worker.fetch(request('/api/hud/references', { method: 'POST', token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'The references proxy exposes no write route.');
  assert.equal(backendCalls.length, referenceCallsBefore + 1, 'An unsupported references method never reaches the backend.');
  response = await worker.fetch(request('/api/hud/references', { token: await token() }), { ...protectedEnv, HUD_BACKEND_ORIGIN: undefined });
  assert.equal(response.status, 409, 'A missing backend origin keeps the owner references view truthfully unconnected.');
  assert.equal(backendCalls.length, referenceCallsBefore + 1, 'An unconnected references read makes no backend request.');
  response = await proxyHudReferences(request('/api/hud/references', { token: ownerAssertion }), { HUD_BACKEND_ORIGIN: 'https://example.invalid' }, async () => {
    assert.fail('An invalid backend origin must not be fetched for references.');
  });
  assert.equal(response.status, 409, 'An untrusted references origin fails closed.');

  response = await worker.fetch(request('/hud/', { host: 'www.nicolasgoureau.com', token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'Worker rejects alternate hosts even with a valid owner JWT');
  assertNoStore(response, 'Alternate-host Worker response is never cacheable.');
  assert.equal(protectedAssetCalls, 1);
}, async (input, init) => {
  backendCalls.push({ init, input });
  return backendResponse();
});

console.log('Career HUD Access gate: missing configuration, alternate and encoded aliases, raw identity header, unsigned/tampered/expired/wrong-owner/wrong-audience/wrong-issuer/non-app tokens, HEAD, valid signed owner token, protected no-store HUD assets, public-site and Apps-proxy preservation, bounded opportunities writes, and bounded references responses passed.');
