import assert from 'node:assert/strict';
import fs from 'node:fs';
import { proxyHudConnectionTest, proxyHudConnectionUpdate, proxyHudConnections } from '../worker/index.js';

const backendOrigin = 'https://agency-nexus-command.fly.dev';
const assertion = 'verified-owner-assertion';
const env = { HUD_BACKEND_ORIGIN: backendOrigin };
const calls = [];
const fetchImpl = async (input, init) => {
  calls.push({ input: String(input), init });
  return new Response('{"revision":"settings_revision_001","sources":{}}', {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' },
    status: 200,
  });
};
const request = (path, options = {}) => new Request(`https://nicolasgoureau.com${path}`, {
  body: options.body,
  headers: {
    Cookie: 'untrusted=browser-cookie',
    Origin: 'https://nicolasgoureau.com',
    'cf-access-jwt-assertion': assertion,
    ...(options.headers || {}),
  },
  method: options.method || 'GET',
});

let response = await proxyHudConnections(request('/api/hud/connections'), env, fetchImpl);
assert.equal(response.status, 200, 'The owner may read only the fixed connections settings route.');
assert.match(response.headers.get('Cache-Control'), /no-store/, 'Connections settings are never cacheable.');
assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'Connections proxy never emits CORS.');
assert.equal(calls[0].input, `${backendOrigin}/api/hud/connections`, 'Connections proxy cannot use a caller-selected backend route.');
assert.equal(calls[0].init.method, 'GET');
assert.equal(new Headers(calls[0].init.headers).get('Accept'), 'application/json');
assert.equal(new Headers(calls[0].init.headers).get('cf-access-jwt-assertion'), assertion, 'The verified Access assertion is forwarded upstream.');
assert.equal(new Headers(calls[0].init.headers).get('Cookie'), null, 'Browser cookies are never forwarded upstream.');
assert.equal(new Headers(calls[0].init.headers).get('Origin'), null, 'Browser Origin is checked at the Worker and never forwarded.');
assert.equal(calls[0].init.redirect, 'error', 'Connections proxy rejects upstream redirects.');

const testBody = new TextEncoder().encode(JSON.stringify({ url: 'https://docs.google.com/spreadsheets/d/private-source/edit' }));
response = await proxyHudConnectionTest(request('/api/hud/connections/opportunities/test', { body: testBody, method: 'POST' }), env, 'opportunities', testBody, fetchImpl);
assert.equal(response.status, 200, 'Only the fixed source test route is proxied.');
assert.equal(calls[1].input, `${backendOrigin}/api/hud/connections/opportunities/test`);
assert.equal(calls[1].init.method, 'POST');
assert.equal(new Headers(calls[1].init.headers).get('Content-Type'), 'application/json');
assert.equal(new Headers(calls[1].init.headers).get('Origin'), 'https://nicolasgoureau.com', 'Connections tests forward only the validated canonical origin for backend defense in depth.');
assert.deepEqual(JSON.parse(new TextDecoder().decode(calls[1].init.body)), JSON.parse(new TextDecoder().decode(testBody)), 'The bounded test payload is preserved for the fixed route.');

const updateBody = new TextEncoder().encode(JSON.stringify({ url: 'https://drive.google.com/drive/folders/private-source', expectedRevision: 'settings_revision_001' }));
response = await proxyHudConnectionUpdate(request('/api/hud/connections/photos', { body: updateBody, method: 'PUT' }), env, 'photos', updateBody, fetchImpl);
assert.equal(response.status, 200, 'Only the fixed source update route is proxied.');
assert.equal(calls[2].input, `${backendOrigin}/api/hud/connections/photos`);
assert.equal(calls[2].init.method, 'PUT');
assert.equal(new Headers(calls[2].init.headers).get('Content-Type'), 'application/json');
assert.equal(new Headers(calls[2].init.headers).get('Origin'), 'https://nicolasgoureau.com', 'Connections updates forward only the validated canonical origin for backend defense in depth.');

response = await proxyHudConnectionTest(request('/api/hud/connections/untrusted/test', { body: testBody, method: 'POST' }), env, 'untrusted', testBody, fetchImpl);
assert.equal(response.status, 400, 'Unknown connection source names are rejected before proxying.');
assert.equal(calls.length, 3, 'Rejected sources never reach the backend.');
response = await proxyHudConnectionUpdate(request('/api/hud/connections/photos', {
  body: updateBody,
  headers: { Origin: 'https://attacker.invalid' },
  method: 'PUT',
}), env, 'photos', updateBody, fetchImpl);
assert.equal(response.status, 400, 'A non-canonical mutation origin is rejected before proxying.');
assert.equal(calls.length, 3, 'A rejected mutation origin never reaches the backend.');

const worker = fs.readFileSync('worker/index.js', 'utf8');
assert(worker.includes("pathname === '/api/hud/connections' && request.method === 'GET' && !url.search"), 'Settings GET permits only the exact queryless route.');
assert(worker.includes("connectionTestMatch && request.method === 'POST' && !url.search"), 'Source tests permit only exact queryless POST routes.');
assert(worker.includes("connectionMatch && request.method === 'PUT' && !url.search"), 'Source updates permit only exact queryless PUT routes.');
assert((worker.match(/const body = await boundedHudUpdateBody\(request\);/g) || []).length >= 3, 'Both Connections mutations reuse the existing same-origin, JSON, streamed body cap.');
assert(!worker.includes('access-control-allow-origin'), 'Connections proxy source never adds CORS.');

console.log('Career HUD connections contract: fixed owner-only routes, same-origin mutation guard, minimal forwarded headers, no CORS, and no caller-selected backend paths verified.');
