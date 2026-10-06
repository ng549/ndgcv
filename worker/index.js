import { hudNotFoundResponse, isHudApiPath, isHudEncodedAlias, isHudPath, noStoreHudResponse, requireHudAccess } from './hud-access.mjs';

const appRoutes = [
  ['/apps/restoreflow', 'RESTOREFLOW'],
  ['/apps/factoryq', 'FACTORYQ'],
  ['/apps/franchiseops', 'FRANCHISEOPS'],
  ['/apps/rentalops', 'RENTALOPS'],
  ['/apps/permitpath', 'PERMITPATH'],
];

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
