import { hudBackendUnavailableResponse, hudNotConnectedResponse, hudNotFoundResponse, isHudApiPath, isHudEncodedAlias, isHudPath, noStoreHudResponse, requireHudAccess } from './hud-access.mjs';

const appRoutes = [
  ['/apps/restoreflow', 'RESTOREFLOW'],
  ['/apps/factoryq', 'FACTORYQ'],
  ['/apps/franchiseops', 'FRANCHISEOPS'],
  ['/apps/rentalops', 'RENTALOPS'],
  ['/apps/permitpath', 'PERMITPATH'],
];

const hudBackendHost = 'agency-nexus-command.fly.dev';
const hudCanonicalOrigin = 'https://nicolasgoureau.com';
const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};
const hudOpportunityIdPattern = /^opp_[A-Za-z0-9_-]{8,128}$/;
const hudConnectionSourcePattern = /^(opportunities|references|photos)$/;
const hudUpdateContentType = /^application\/json(?:\s*;\s*charset=utf-8)?$/i;
const hudUpdateMaxBytes = 16 * 1024;
export const HUD_REFERENCES_MAX_BYTES = 2 * 1024 * 1024;

function declaredBodyExceedsLimit(response, maxBytes) {
  const declaredLength = response.headers.get('Content-Length');
  return Boolean(declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes);
}

function hudBackendOrigin(env) {
  const raw = typeof env?.HUD_BACKEND_ORIGIN === 'string' ? env.HUD_BACKEND_ORIGIN.trim() : '';
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== hudBackendHost ||
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

function proxyResponse(upstream, body = upstream.body) {
  const contentType = upstream.headers.get('Content-Type');
  const headers = new Headers(noStoreHeaders);
  if (contentType) headers.set('Content-Type', contentType);
  return new Response(body, {
    headers,
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

async function cancelHudResponseBody(body) {
  try {
    await body?.cancel();
  } catch {
    // The upstream body may already have ended or failed.
  }
}

async function rejectHudRedirect(upstream) {
  if (upstream.status < 300 || upstream.status >= 400) return null;
  await cancelHudResponseBody(upstream.body);
  return hudBackendUnavailableResponse();
}

async function boundedHudReferencesResponse(upstream) {
  if (declaredBodyExceedsLimit(upstream, HUD_REFERENCES_MAX_BYTES)) {
    await cancelHudResponseBody(upstream.body);
    return hudBackendUnavailableResponse();
  }
  if (!upstream.body) return proxyResponse(upstream, null);

  const reader = upstream.body.getReader();
  const chunks = [];
  let byteLength = 0;
  let cancelled = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > HUD_REFERENCES_MAX_BYTES) {
        await reader.cancel();
        cancelled = true;
        return hudBackendUnavailableResponse();
      }
      chunks.push(value);
    }
  } catch {
    if (!cancelled) await cancelHudResponseBody(reader);
    return hudBackendUnavailableResponse();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return proxyResponse(upstream, body);
}

function hudInvalidUpdateResponse() {
  return new Response('HUD update is invalid.', {
    status: 400,
    headers: noStoreHeaders,
  });
}

function isSameOriginHudWrite(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function boundedHudUpdateBody(request) {
  if (!hudUpdateContentType.test(request.headers.get('Content-Type') || '') || !isSameOriginHudWrite(request)) return null;
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > hudUpdateMaxBytes)) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > hudUpdateMaxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const body = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return body;
  } catch {
    try { await reader.cancel(); } catch { /* The request stream already failed or ended. */ }
    return null;
  }
}

async function proxyHudRequest(request, env, pathname, { method = 'GET', body = undefined, contentType = null, origin = null } = {}, fetchImpl = fetch) {
  const backendOrigin = hudBackendOrigin(env);
  if (!backendOrigin) return hudNotConnectedResponse();

  const assertion = request.headers.get('cf-access-jwt-assertion');
  if (!assertion) return hudNotConnectedResponse();
  const headers = new Headers({
    Accept: method === 'GET' && pathname === '/api/hud/photo' ? 'image/jpeg' : 'application/json',
    'cf-access-jwt-assertion': assertion,
  });
  if (contentType) headers.set('Content-Type', contentType);
  if (origin) headers.set('Origin', origin);
  try {
    const upstream = await fetchImpl(new URL(pathname, backendOrigin), {
      body,
      headers,
      method,
      redirect: 'manual',
    });
    const rejectedRedirect = await rejectHudRedirect(upstream);
    if (rejectedRedirect) return rejectedRedirect;
    return proxyResponse(upstream);
  } catch {
    return hudBackendUnavailableResponse();
  }
}

function canonicalHudWriteOrigin(request) {
  const origin = request.headers.get('Origin');
  try {
    return origin === hudCanonicalOrigin && new URL(request.url).origin === hudCanonicalOrigin ? origin : null;
  } catch {
    return null;
  }
}

export async function proxyHudOpportunities(request, env, fetchImpl = fetch) {
  return proxyHudRequest(request, env, '/api/hud/opportunities', {}, fetchImpl);
}

export async function proxyHudReferences(request, env, fetchImpl = fetch) {
  const origin = hudBackendOrigin(env);
  if (!origin) return hudNotConnectedResponse();

  const assertion = request.headers.get('cf-access-jwt-assertion');
  if (!assertion) return hudNotConnectedResponse();
  try {
    const upstream = await fetchImpl(new URL('/api/hud/references', origin), {
      headers: new Headers({
        Accept: 'application/json',
        'cf-access-jwt-assertion': assertion,
      }),
      method: 'GET',
      redirect: 'manual',
    });
    const rejectedRedirect = await rejectHudRedirect(upstream);
    if (rejectedRedirect) return rejectedRedirect;
    return boundedHudReferencesResponse(upstream);
  } catch {
    return hudBackendUnavailableResponse();
  }
}

export async function proxyHudPhoto(request, env, fetchImpl = fetch) {
  return proxyHudRequest(request, env, '/api/hud/photo', {}, fetchImpl);
}

export async function proxyHudOpportunityUpdate(request, env, opportunityId, body, fetchImpl = fetch) {
  if (!hudOpportunityIdPattern.test(opportunityId)) return hudInvalidUpdateResponse();
  return proxyHudRequest(request, env, `/api/hud/opportunities/${opportunityId}`, {
    body,
    contentType: 'application/json',
    method: 'PATCH',
  }, fetchImpl);
}

export async function proxyHudConnections(request, env, fetchImpl = fetch) {
  return proxyHudRequest(request, env, '/api/hud/connections', {}, fetchImpl);
}

export async function proxyHudConnectionTest(request, env, source, body, fetchImpl = fetch) {
  const origin = canonicalHudWriteOrigin(request);
  if (!hudConnectionSourcePattern.test(source) || !origin) return hudInvalidUpdateResponse();
  return proxyHudRequest(request, env, `/api/hud/connections/${source}/test`, {
    body,
    contentType: 'application/json',
    method: 'POST',
    origin,
  }, fetchImpl);
}

export async function proxyHudConnectionUpdate(request, env, source, body, fetchImpl = fetch) {
  const origin = canonicalHudWriteOrigin(request);
  if (!hudConnectionSourcePattern.test(source) || !origin) return hudInvalidUpdateResponse();
  return proxyHudRequest(request, env, `/api/hud/connections/${source}`, {
    body,
    contentType: 'application/json',
    method: 'PUT',
    origin,
  }, fetchImpl);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const hudRoute = isHudPath(pathname);
    const hudApiRoute = isHudApiPath(pathname);

    if (isHudEncodedAlias(pathname)) return hudNotFoundResponse();

    if (hudRoute || hudApiRoute) {
      const denied = await requireHudAccess(request, env);
      if (denied) return denied;
      if (hudApiRoute) {
        if (pathname === '/api/hud/opportunities' && request.method === 'GET' && !url.search) return proxyHudOpportunities(request, env);
        if (pathname === '/api/hud/references' && request.method === 'GET' && !url.search) return proxyHudReferences(request, env);
        if (pathname === '/api/hud/photo' && request.method === 'GET' && !url.search) return proxyHudPhoto(request, env);
        if (pathname === '/api/hud/connections' && request.method === 'GET' && !url.search) return proxyHudConnections(request, env);
        const opportunityMatch = /^\/api\/hud\/opportunities\/(opp_[A-Za-z0-9_-]{8,128})$/.exec(pathname);
        if (opportunityMatch && request.method === 'PATCH' && !url.search) {
          const body = await boundedHudUpdateBody(request);
          if (!body) return hudInvalidUpdateResponse();
          return proxyHudOpportunityUpdate(request, env, opportunityMatch[1], body);
        }
        const connectionTestMatch = /^\/api\/hud\/connections\/(opportunities|references|photos)\/test$/.exec(pathname);
        if (connectionTestMatch && request.method === 'POST' && !url.search) {
          const body = await boundedHudUpdateBody(request);
          if (!body) return hudInvalidUpdateResponse();
          return proxyHudConnectionTest(request, env, connectionTestMatch[1], body);
        }
        const connectionMatch = /^\/api\/hud\/connections\/(opportunities|references|photos)$/.exec(pathname);
        if (connectionMatch && request.method === 'PUT' && !url.search) {
          const body = await boundedHudUpdateBody(request);
          if (!body) return hudInvalidUpdateResponse();
          return proxyHudConnectionUpdate(request, env, connectionMatch[1], body);
        }
        return new Response('HUD API is not connected.', {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }

    for (const [prefix, binding] of appRoutes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return env[binding].fetch(request);
      }
    }
    const asset = await env.ASSETS.fetch(request);
    return hudRoute ? noStoreHudResponse(asset) : asset;
  },
};
