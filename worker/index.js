const appRoutes = [
  ['/apps/restoreflow', 'RESTOREFLOW'],
  ['/apps/factoryq', 'FACTORYQ'],
  ['/apps/franchiseops', 'FRANCHISEOPS'],
  ['/apps/rentalops', 'RENTALOPS'],
  ['/apps/permitpath', 'PERMITPATH'],
];

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    for (const [prefix, binding] of appRoutes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return env[binding].fetch(request);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
