import { createRemoteJWKSet, jwtVerify } from 'jose';

const cacheControl = 'no-store, max-age=0';
const jwksByIssuer = new Map();
const requiredConfiguration = [
  'HUD_CANONICAL_HOST',
  'HUD_ACCESS_TEAM_DOMAIN',
  'HUD_ACCESS_AUD',
  'HUD_OWNER_EMAIL',
];

export function isHudPath(pathname) {
  return pathname === '/hud' || pathname.startsWith('/hud/');
}

export function isHudApiPath(pathname) {
  return pathname === '/api/hud' || pathname.startsWith('/api/hud/');
}

// URL.pathname intentionally keeps percent escapes. A static asset layer may not;
// reject paths that become HUD paths after a bounded decode rather than relying on
// an edge-specific decoding order.
export function isHudEncodedAlias(pathname) {
  if (typeof pathname !== 'string' || !pathname.includes('%')) return false;
  let decoded = pathname;
  for (let count = 0; count < 4; count += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return false;
    }
    if (isHudPath(decoded) || isHudApiPath(decoded)) return true;
    if (!decoded.includes('%')) return false;
  }
  return false;
}

function noStoreResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function hudNotFoundResponse() {
  return noStoreResponse('Not found.', 404);
}

export function noStoreHudResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function requiredString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function canonicalHost(value) {
  const host = requiredString(value)?.toLowerCase();
  return host && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) ? host : null;
}

function accessTeamDomain(value) {
  const raw = requiredString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !hostname.endsWith('.cloudflareaccess.com')
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function hudAccessConfiguration(env) {
  if (!env || requiredConfiguration.some(name => !requiredString(env[name]))) return null;
  const host = canonicalHost(env.HUD_CANONICAL_HOST);
  const issuer = accessTeamDomain(env.HUD_ACCESS_TEAM_DOMAIN);
  const audience = requiredString(env.HUD_ACCESS_AUD);
  const ownerEmail = requiredString(env.HUD_OWNER_EMAIL)?.toLowerCase();
  if (!host || !issuer || !audience || !ownerEmail) return null;
  return { audience, host, issuer, ownerEmail };
}

function remoteJwks(issuer) {
  let jwks = jwksByIssuer.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer), {
      cacheMaxAge: 5 * 60 * 1000,
      cooldownDuration: 5 * 1000,
      timeoutDuration: 5 * 1000,
    });
    jwksByIssuer.set(issuer, jwks);
  }
  return jwks;
}

// Returns null only after all configuration, host, token, signature, issuer, audience,
// lifetime, token type, and owner checks succeed. Callers must return the response otherwise.
export async function requireHudAccess(request, env) {
  const configuration = hudAccessConfiguration(env);
  if (!configuration) return noStoreResponse('Private workspace unavailable.', 503);

  const url = new URL(request.url);
  if (url.hostname.toLowerCase() !== configuration.host) return hudNotFoundResponse();

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 12_000) return noStoreResponse('Private workspace access required.', 403);

  try {
    const { payload } = await jwtVerify(token, remoteJwks(configuration.issuer), {
      algorithms: ['RS256'],
      audience: configuration.audience,
      clockTolerance: 30,
      issuer: configuration.issuer,
      requiredClaims: ['aud', 'email', 'exp', 'iat', 'iss', 'nbf', 'sub'],
    });
    if (
      payload.type !== 'app' ||
      typeof payload.email !== 'string' ||
      payload.email.toLowerCase() !== configuration.ownerEmail
    ) return noStoreResponse('Private workspace access required.', 403);
  } catch {
    return noStoreResponse('Private workspace access required.', 403);
  }

  return null;
}

// Kept for local cryptographic tests; not used by request handling.
export function resetHudAccessKeyCacheForTests() {
  jwksByIssuer.clear();
}
