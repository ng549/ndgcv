import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import worker from '../worker/index.js';
import { resetHudAccessKeyCacheForTests } from '../worker/hud-access.mjs';
import { isIntakePath, isMediaOsEncodedAlias, isMediaOsPath, mediaOsOrigin, proxyMediaOs } from '../worker/mediaos-proxy.mjs';

const issuer = 'https://career-hud-test.cloudflareaccess.com';
const audience = 'career-hud-test-audience';
const ownerEmail = 'owner@example.com';
const origin = 'https://media-os-test.fly.dev';
const secret = 'x'.repeat(40);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
Object.assign(publicJwk, { alg: 'RS256', kid: 'mediaos-test-key', use: 'sig' });

const env = Object.freeze({
  HUD_ACCESS_AUD: audience,
  HUD_ACCESS_TEAM_DOMAIN: issuer,
  HUD_CANONICAL_HOST: 'nicolasgoureau.com',
  HUD_OWNER_EMAIL: ownerEmail,
  MEDIAOS_ORIGIN: origin,
  MEDIAOS_PROXY_SECRET: secret,
  ASSETS: { fetch: () => { throw new Error('Media OS paths must never reach static assets'); } },
});

async function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    aud: [audience], email: ownerEmail, exp: now + 300, iat: now - 5, iss: issuer,
    nbf: now - 5, sub: 'test-owner', type: 'app', ...overrides,
  }).setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid, typ: 'JWT' }).sign(privateKey);
}

async function withNetwork(upstream, run) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) === `${issuer}/cdn-cgi/access/certs`) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'Content-Type': 'application/json' } });
    }
    calls.push({ url: String(input), init });
    assert(upstream, `Unexpected network request: ${input}`);
    return upstream(input, init);
  };
  resetHudAccessKeyCacheForTests();
  try {
    return await run(calls);
  } finally {
    resetHudAccessKeyCacheForTests();
    globalThis.fetch = originalFetch;
  }
}

// Path matching.
assert.equal(isMediaOsPath('/mediaos'), true);
assert.equal(isMediaOsPath('/mediaos/projects/1'), true);
assert.equal(isMediaOsPath('/mediaosx'), false);
assert.equal(isMediaOsPath('/apps/mediaos'), false);
assert.equal(isMediaOsEncodedAlias('/%6Dediaos'), true);
assert.equal(isMediaOsEncodedAlias('/media%20os'), false);

// Origin validation: only bare https *.fly.dev origins.
assert.equal(mediaOsOrigin({ MEDIAOS_ORIGIN: origin }), origin);
for (const bad of ['http://media-os-test.fly.dev', 'https://evil.example.com', 'https://media-os-test.fly.dev/x', 'https://u:p@media-os-test.fly.dev', '']) {
  assert.equal(mediaOsOrigin({ MEDIAOS_ORIGIN: bad }), null, bad);
}

// No Access token: denied before any upstream call.
await withNetwork(null, async () => {
  const response = await worker.fetch(new Request('https://nicolasgoureau.com/mediaos'), env);
  assert.equal(response.status, 403);
});

// Wrong owner: denied.
await withNetwork(null, async () => {
  const request = new Request('https://nicolasgoureau.com/mediaos', { headers: { 'cf-access-jwt-assertion': await token({ email: 'someone@example.com' }) } });
  assert.equal((await worker.fetch(request, env)).status, 403);
});

// Encoded alias: refused.
await withNetwork(null, async () => {
  assert.equal((await worker.fetch(new Request('https://nicolasgoureau.com/%6Dediaos'), env)).status, 404);
});

// Owner: forwarded with full path, query, secret and prefix; response passed through.
await withNetwork(async () => new Response('<h1>Media OS</h1>', {
  status: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'leak=1', 'X-Internal': 'nope' },
}), async (calls) => {
  const request = new Request('https://nicolasgoureau.com/mediaos/projects?x=1', {
    headers: { 'cf-access-jwt-assertion': await token(), Cookie: 'site=1', Accept: 'text/html' },
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<h1>Media OS</h1>');
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('x-internal'), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${origin}/mediaos/projects?x=1`);
  const sent = calls[0].init.headers;
  assert.equal(sent.get('x-mediaos-proxy-secret'), secret);
  assert.equal(sent.get('x-forwarded-prefix'), '/mediaos');
  assert.equal(sent.get('cookie'), null);
  assert.equal(sent.get('accept'), 'text/html');
});

// POST bodies stream through.
await withNetwork(async (input, init) => new Response(await new Response(init.body).text(), { status: 201 }), async (calls) => {
  const request = new Request('https://nicolasgoureau.com/mediaos/api/projects', {
    method: 'POST',
    body: '{"name":"Test"}',
    headers: { 'cf-access-jwt-assertion': await token(), 'Content-Type': 'application/json' },
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 201);
  assert.equal(await response.text(), '{"name":"Test"}');
  assert.equal(calls[0].init.method, 'POST');
});

// Redirects: same-app kept as relative path, foreign dropped.
await withNetwork(async () => new Response(null, { status: 302, headers: { Location: '/mediaos/projects/2' } }), async () => {
  const response = await worker.fetch(new Request('https://nicolasgoureau.com/mediaos/new', { headers: { 'cf-access-jwt-assertion': await token() } }), env);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/mediaos/projects/2');
});
await withNetwork(async () => new Response(null, { status: 302, headers: { Location: 'https://evil.example.com/' } }), async () => {
  const response = await worker.fetch(new Request('https://nicolasgoureau.com/mediaos/new', { headers: { 'cf-access-jwt-assertion': await token() } }), env);
  assert.equal(response.status, 502);
});

// Not configured yet: clear 503, no upstream call.
{
  const request = new Request('https://nicolasgoureau.com/mediaos', { headers: { 'cf-access-jwt-assertion': 'checked-upstream' } });
  assert.equal((await proxyMediaOs(request, { MEDIAOS_ORIGIN: origin })).status, 503);
  assert.equal((await proxyMediaOs(request, { MEDIAOS_PROXY_SECRET: secret })).status, 503);
}

// Upstream down: 502.
await withNetwork(async () => { throw new Error('down'); }, async () => {
  const response = await worker.fetch(new Request('https://nicolasgoureau.com/mediaos', { headers: { 'cf-access-jwt-assertion': await token() } }), env);
  assert.equal(response.status, 502);
});

// Guest interview links: no Access login needed, still get the proxy secret,
// never carry an Access assertion upstream, and are not indexable.
assert.equal(isIntakePath('/intake/abc'), true);
assert.equal(isIntakePath('/intake'), false);
assert.equal(isIntakePath('/intakes/abc'), false);
assert.equal(isMediaOsEncodedAlias('/%69ntake/abc'), true);
await withNetwork(async () => new Response('<p>chat</p>', { headers: { 'Content-Type': 'text/html' } }), async (calls) => {
  const response = await worker.fetch(new Request('https://nicolasgoureau.com/intake/tok123?x=1', { headers: { 'cf-access-jwt-assertion': 'should-not-forward' } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(calls[0].url, `${origin}/intake/tok123?x=1`);
  assert.equal(calls[0].init.headers.get('x-mediaos-proxy-secret'), secret);
  assert.equal(calls[0].init.headers.get('cf-access-jwt-assertion'), null);
});
await withNetwork(async (input, init) => new Response(await new Response(init.body).text(), { status: 201 }), async () => {
  const response = await worker.fetch(new Request('https://nicolasgoureau.com/intake/api/tok123/files?name=a.png', { method: 'POST', body: 'png-bytes', headers: { 'Content-Type': 'image/png' } }), env);
  assert.equal(response.status, 201);
  assert.equal(await response.text(), 'png-bytes');
});
// The owner area still requires Access even with an intake-looking suffix.
await withNetwork(null, async () => {
  assert.equal((await worker.fetch(new Request('https://nicolasgoureau.com/mediaos/intake/tok123'), env)).status, 403);
});

console.log('Media OS proxy checks passed.');
