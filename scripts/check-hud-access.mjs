import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import worker from '../worker/index.js';
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

async function withAccessJwks(run) {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async input => {
    requests += 1;
    assert.equal(String(input), `${issuer}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [publicJwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
  return new Request(`https://${host}${path}`, { headers, method: options.method });
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

await withAccessJwks(async () => {
  let protectedAssetCalls = 0;
  const protectedEnv = {
    ...env,
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
  response = await worker.fetch(request('/hud/', { host: 'www.nicolasgoureau.com', token: await token() }), protectedEnv);
  assert.equal(response.status, 404, 'Worker rejects alternate hosts even with a valid owner JWT');
  assertNoStore(response, 'Alternate-host Worker response is never cacheable.');
  assert.equal(protectedAssetCalls, 1);
});

console.log('Career HUD Access gate: missing configuration, alternate and encoded aliases, raw identity header, unsigned/tampered/expired/wrong-owner/wrong-audience/wrong-issuer/non-app tokens, HEAD, valid signed owner token, protected no-store HUD assets, public-site and Apps-proxy preservation, and future API fail-closed behavior passed.');
