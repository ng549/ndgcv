// Media OS lives in its own Fly app; this Worker only forwards
// nicolasgoureau.com/mediaos* to it after the same Cloudflare Access owner
// check the HUD uses. The full path (including /mediaos) is forwarded
// unchanged so the app can serve itself under that prefix.

const mediaOsHostSuffix = '.fly.dev';
const cacheControl = 'no-store, max-age=0';

const forwardedRequestHeaders = [
  'accept',
  'content-length',
  'content-type',
  'if-none-match',
  'range',
];

const forwardedResponseHeaders = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];

export function isMediaOsPath(pathname) {
  return pathname === '/mediaos' || pathname.startsWith('/mediaos/');
}

// Guest interview links (nicolasgoureau.com/intake/<private token>) are for
// people without a Cloudflare Access login. The app checks the token; the
// Worker still adds the proxy secret so only this site can reach the app.
export function isIntakePath(pathname) {
  return pathname.startsWith('/intake/');
}

// Mirrors isHudEncodedAlias: refuse percent-encoded spellings of /mediaos so
// they cannot reach the static asset layer under a different decoding order.
export function isMediaOsEncodedAlias(pathname) {
  if (typeof pathname !== 'string' || !pathname.includes('%')) return false;
  let decoded = pathname;
  for (let count = 0; count < 4; count += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return false;
    }
    if (isMediaOsPath(decoded) || isIntakePath(decoded)) return true;
    if (!decoded.includes('%')) return false;
  }
  return false;
}

function textResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function mediaOsOrigin(env) {
  const raw = typeof env?.MEDIAOS_ORIGIN === 'string' ? env.MEDIAOS_ORIGIN.trim() : '';
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      !url.hostname.toLowerCase().endsWith(mediaOsHostSuffix) ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function proxySecret(env) {
  const secret = typeof env?.MEDIAOS_PROXY_SECRET === 'string' ? env.MEDIAOS_PROXY_SECRET.trim() : '';
  return secret.length >= 32 ? secret : null;
}

// Only same-app redirects are passed through; anything pointing elsewhere
// (including the bare fly.dev origin) is dropped rather than leaked.
function safeLocation(location, requestUrl) {
  if (!location) return null;
  try {
    const target = new URL(location, requestUrl);
    const canonical = new URL(requestUrl);
    if (target.origin !== canonical.origin || !(isMediaOsPath(target.pathname) || isIntakePath(target.pathname))) return null;
    return `${target.pathname}${target.search}`;
  } catch {
    return null;
  }
}

// For /mediaos, callers must run requireHudAccess first; this function trusts
// that the request already passed the owner check. Guest /intake/ requests
// pass { guest: true } and carry no Access assertion.
export async function proxyMediaOs(request, env, fetchImpl = fetch, { guest = false } = {}) {
  const origin = mediaOsOrigin(env);
  const secret = proxySecret(env);
  if (!origin || !secret) return textResponse('Media OS is not connected yet.', 503);

  const assertion = guest ? null : request.headers.get('cf-access-jwt-assertion');
  if (!guest && !assertion) return textResponse('Private workspace access required.', 403);

  const url = new URL(request.url);
  const headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (assertion) headers.set('cf-access-jwt-assertion', assertion);
  headers.set('x-mediaos-proxy-secret', secret);
  headers.set('x-forwarded-prefix', '/mediaos');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream;
  try {
    upstream = await fetchImpl(new URL(`${url.pathname}${url.search}`, origin), {
      body: hasBody ? request.body : undefined,
      duplex: hasBody ? 'half' : undefined,
      headers,
      method: request.method,
      redirect: 'manual',
    });
  } catch {
    return textResponse('Media OS is unavailable.', 502);
  }

  const responseHeaders = new Headers();
  for (const name of forwardedResponseHeaders) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has('cache-control')) responseHeaders.set('Cache-Control', cacheControl);
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('X-Frame-Options', 'DENY');
  responseHeaders.set('Referrer-Policy', guest ? 'no-referrer' : 'same-origin');
  if (guest) responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = safeLocation(upstream.headers.get('location'), request.url);
    try { await upstream.body?.cancel(); } catch { /* already closed */ }
    if (!location) return textResponse('Media OS is unavailable.', 502);
    responseHeaders.set('Location', location);
    return new Response(null, { status: upstream.status, headers: responseHeaders });
  }

  return new Response(upstream.body, {
    headers: responseHeaders,
    status: upstream.status,
    statusText: upstream.statusText,
  });
}
