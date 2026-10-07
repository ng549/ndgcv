import { hudBackendUnavailableResponse, hudNotConnectedResponse, hudNotFoundResponse, isHudApiPath, isHudEncodedAlias, isHudPath, noStoreHudResponse, requireHudAccess } from './hud-access.mjs';

const appRoutes = [
  ['/apps/restoreflow', 'RESTOREFLOW'],
  ['/apps/factoryq', 'FACTORYQ'],
  ['/apps/franchiseops', 'FRANCHISEOPS'],
  ['/apps/rentalops', 'RENTALOPS'],
  ['/apps/permitpath', 'PERMITPATH'],
];

const hudBackendHost = 'agency-nexus-command.fly.dev';
const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

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

function proxyResponse(upstream) {
  const contentType = upstream.headers.get('Content-Type');
  const headers = new Headers(noStoreHeaders);
  if (contentType) headers.set('Content-Type', contentType);
  return new Response(upstream.body, {
    headers,
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

export async function proxyHudOpportunities(request, env, fetchImpl = fetch) {
  const origin = hudBackendOrigin(env);
  if (!origin) return hudNotConnectedResponse();

  const assertion = request.headers.get('cf-access-jwt-assertion');
  if (!assertion) return hudNotConnectedResponse();
  try {
    const upstream = await fetchImpl(new URL('/api/hud/opportunities', origin), {
      headers: {
        Accept: 'application/json',
        'cf-access-jwt-assertion': assertion,
      },
      method: 'GET',
      redirect: 'error',
    });
    return proxyResponse(upstream);
  } catch {
    return hudBackendUnavailableResponse();
  }
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
        if (pathname === '/api/hud/opportunities' && request.method === 'GET') return proxyHudOpportunities(request, env);
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
