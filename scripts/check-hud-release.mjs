import assert from 'node:assert/strict';

const canonicalOrigin = process.env.HUD_RELEASE_ORIGIN;
if (!canonicalOrigin) {
  console.error('Set HUD_RELEASE_ORIGIN to the canonical HTTPS origin before running this anonymous release check.');
  process.exit(2);
}

const origin = new URL(canonicalOrigin);
assert.equal(origin.protocol, 'https:', 'HUD_RELEASE_ORIGIN must use HTTPS.');
assert.equal(origin.pathname, '/', 'HUD_RELEASE_ORIGIN must not contain a path.');
assert(!origin.search && !origin.hash, 'HUD_RELEASE_ORIGIN must not contain a query or fragment.');

const alternateOrigins = (process.env.HUD_NONCANONICAL_ORIGINS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
  .map(value => new URL(value));

async function get(base, pathname) {
  const url = new URL(pathname, base);
  return fetch(url, { redirect: 'manual', headers: { 'Cache-Control': 'no-store' } });
}

const publicRoot = await get(origin, '/');
assert(publicRoot.ok, `Canonical public root unexpectedly returned ${publicRoot.status}.`);

const protectedPaths = ['/hud', '/hud/', '/hud/hud.js', '/hud/assets/storefront.webp', '/api/hud', '/api/hud/'];
for (const pathname of protectedPaths) {
  const response = await get(origin, pathname);
  assert(!response.ok, `Anonymous ${pathname} is publicly readable (${response.status}).`);
  assert(response.status >= 300, `Anonymous ${pathname} returned an unexpected status ${response.status}.`);
}

for (const alternateOrigin of alternateOrigins) {
  for (const pathname of protectedPaths) {
    const response = await get(alternateOrigin, pathname);
    assert(!response.ok, `Non-canonical ${alternateOrigin.origin}${pathname} is publicly readable (${response.status}).`);
  }
}

console.log(`Anonymous Career HUD release check passed for ${origin.origin}; ${alternateOrigins.length} non-canonical origin(s) also deny HUD paths.`);
console.log('Complete the separate browser checks: owner Access login succeeds, another account is denied, and no configured Access IdP reports invalid_client.');
