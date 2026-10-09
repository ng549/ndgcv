const cloudflareApi = 'https://api.cloudflare.com/client/v4/';
const expectedTeamAuthDomain = 'billowing-darkness-b12a.cloudflareaccess.com';
const knownPublicHosts = new Set(['nicolasgoureau.com', 'www.nicolasgoureau.com']);
const appPageSize = 100;
const maxAppPages = 10;
const requestTimeoutMs = 7_500;

function auditStatus(read) {
  return read.ok ? 200 : read.status;
}

function bindingText(settings, name) {
  const bindings = settings.ok ? settings.result?.bindings : null;
  if (!Array.isArray(bindings)) return { unsupported: settings.ok, value: null };
  const matches = bindings.filter(binding => binding?.name === name);
  if (matches.length !== 1) return { unsupported: matches.length > 1, value: null };
  const value = typeof matches[0]?.text === 'string' ? matches[0].text.trim() : null;
  return { unsupported: value === null, value: value || null };
}

function configuredTeamHost(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function validAudience(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 512 ? value : null;
}

function validPageMetadata(info, page, totalPages) {
  return Number.isSafeInteger(info?.page) && info.page === page
    && Number.isSafeInteger(info?.per_page) && info.per_page === appPageSize
    && Number.isSafeInteger(info?.total_pages) && info.total_pages === totalPages
    && Number.isSafeInteger(info?.total_count) && info.total_count >= 0
    && Number.isSafeInteger(info?.count) && info.count >= 0;
}

function safeNumberOrType(value) {
  if (Number.isSafeInteger(value)) return value;
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function sanitizedPagination(readResult, accumulatedCount) {
  const info = readResult?.resultInfo;
  return {
    accumulatedCount,
    count: safeNumberOrType(info?.count),
    page: safeNumberOrType(info?.page),
    per_page: safeNumberOrType(info?.per_page),
    resultIsArray: Array.isArray(readResult?.result),
    total_count: safeNumberOrType(info?.total_count),
    total_pages: safeNumberOrType(info?.total_pages),
  };
}

function hudRelevantPath(pathname) {
  const path = pathname || '/';
  return path === '/' || path === '/*'
    || path === '/hud' || path === '/hud/*' || path.startsWith('/hud/')
    || path === '/api/hud' || path === '/api/hud/*' || path.startsWith('/api/hud/');
}

function publicHudRoute(value, fallbackPath = '') {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const raw = value.trim();
    const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
    const url = new URL(hasProtocol ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !knownPublicHosts.has(url.hostname.toLowerCase())) return null;
    const explicitPath = url.pathname && url.pathname !== '/' ? url.pathname : '';
    const path = explicitPath || fallbackPath || '/';
    if (!hudRelevantPath(path)) return null;
    const suffix = path === '/' ? '' : path;
    return hasProtocol ? `https://${url.hostname.toLowerCase()}${suffix}` : `${url.hostname.toLowerCase()}${suffix}`;
  } catch {
    return null;
  }
}

function publicRoutesForMatchedApp(app) {
  const fallbackPath = typeof app?.path === 'string' && app.path.startsWith('/') ? app.path : '';
  let unsupported = !app || typeof app !== 'object' || Array.isArray(app);
  let omittedRouteCount = 0;
  const domain = publicHudRoute(app?.domain, fallbackPath);
  if (typeof app?.domain === 'string' && !domain) omittedRouteCount += 1;

  const selfHostedDomains = [];
  if (app?.self_hosted_domains !== undefined && !Array.isArray(app.self_hosted_domains)) {
    unsupported = true;
  } else {
    for (const value of app?.self_hosted_domains || []) {
      const route = publicHudRoute(value, fallbackPath);
      if (route) selfHostedDomains.push(route);
      else if (typeof value === 'string') omittedRouteCount += 1;
      else unsupported = true;
    }
  }

  const destinations = [];
  if (app?.destinations !== undefined && !Array.isArray(app.destinations)) {
    unsupported = true;
  } else {
    for (const destination of app?.destinations || []) {
      if (!destination || typeof destination !== 'object' || Array.isArray(destination)) {
        unsupported = true;
        continue;
      }
      const uri = publicHudRoute(destination.uri, fallbackPath);
      if (!uri) {
        if (typeof destination.uri === 'string') omittedRouteCount += 1;
        else unsupported = true;
        continue;
      }
      const safeDestination = { uri };
      if (typeof destination.type === 'string') safeDestination.type = destination.type;
      if (typeof destination.public === 'boolean') safeDestination.public = destination.public;
      destinations.push(safeDestination);
    }
  }
  return {
    routes: { domain, destinations, omittedRouteCount, selfHostedDomains },
    unsupported,
  };
}

function organizationDomain(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.auth_domain !== 'string') return null;
  return result.auth_domain.trim().toLowerCase() || null;
}

export async function runHudRuntimeIdentityAudit({ account, fetchImpl = fetch, token }) {
  const accountId = encodeURIComponent(account || 'c8238aed298b28ab172aa56bb1e9cd22');
  const headers = { Authorization: `Bearer ${token || ''}` };
  async function read(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(new URL(path, cloudflareApi), {
        headers,
        method: 'GET',
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) return { ok: false, status: response.status };
      return { ok: true, result: payload.result, resultInfo: payload.result_info };
    } catch {
      return { ok: false, status: 0 };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function readApps() {
    const pages = [];
    let totalPages = null;
    let totalCount = null;
    let pagination = sanitizedPagination(null, 0);
    const unknown = (failureReason, { ok = true, status = 200, unsupported = true } = {}) => ({
      apps: null,
      completePagination: null,
      failureReason,
      ok,
      pagination,
      status,
      unsupported,
    });
    for (let page = 1; page <= maxAppPages; page += 1) {
      const readResult = await read(`accounts/${accountId}/access/apps?per_page=${appPageSize}&page=${page}`);
      pagination = sanitizedPagination(readResult, pages.length);
      if (!readResult.ok) return unknown('request_failed', { ok: false, status: readResult.status, unsupported: false });
      if (!Array.isArray(readResult.result)) return unknown('result_not_array');
      const info = readResult.resultInfo;
      if (page === 1) {
        if (!info || typeof info !== 'object' || Array.isArray(info)) {
          return unknown(readResult.result.length === 0 ? 'empty_result_missing_pagination' : 'missing_pagination_metadata');
        }
        const hasPaginationField = ['page', 'per_page', 'count', 'total_count', 'total_pages']
          .some(field => info[field] !== undefined);
        if (!hasPaginationField) {
          return unknown(readResult.result.length === 0 ? 'empty_result_missing_pagination' : 'missing_pagination_metadata');
        }
        if (!Number.isSafeInteger(info.total_pages) || info.total_pages < 1) return unknown('invalid_total_pages');
        totalPages = info.total_pages;
        totalCount = info.total_count;
        if (totalPages > maxAppPages) {
          return {
            apps: null,
            completePagination: false,
            failureReason: 'page_limit_exceeded',
            ok: true,
            pagination,
            status: 200,
            unsupported: false,
          };
        }
      }
      if (!validPageMetadata(info, page, totalPages) || info.total_count !== totalCount || info.count !== readResult.result.length) {
        return unknown(!validPageMetadata(info, page, totalPages)
          ? 'invalid_pagination_metadata'
          : info.total_count !== totalCount ? 'inconsistent_total_count' : 'count_mismatch');
      }
      pages.push(...readResult.result);
      if (page === totalPages) {
        pagination = sanitizedPagination(readResult, pages.length);
        if (pages.length !== totalCount) return unknown('accumulated_count_mismatch');
        return {
          apps: pages,
          completePagination: true,
          failureReason: null,
          ok: true,
          pagination,
          status: 200,
          unsupported: false,
        };
      }
    }
    return {
      apps: null,
      completePagination: false,
      failureReason: 'page_limit_exhausted',
      ok: true,
      pagination,
      status: 200,
      unsupported: false,
    };
  }

  const [settings, organization] = await Promise.all([
    read(`accounts/${accountId}/workers/scripts/ndgcv/settings`),
    read(`accounts/${accountId}/access/organizations`),
  ]);
  const apps = await readApps();
  const audienceBinding = bindingText(settings, 'HUD_ACCESS_AUD');
  const teamBinding = bindingText(settings, 'HUD_ACCESS_TEAM_DOMAIN');
  const audience = validAudience(audienceBinding.value);
  const complete = apps.completePagination === true && Boolean(audience);
  const matches = complete ? apps.apps.filter(app => app && typeof app === 'object' && !Array.isArray(app) && app.aud === audience) : null;
  const matchCount = matches ? matches.length : null;
  const audienceMatch = matchCount === null ? null : matchCount === 1;
  const routes = audienceMatch ? publicRoutesForMatchedApp(matches[0]) : null;
  const configuredTeam = configuredTeamHost(teamBinding.value);
  const organizationTeam = organization.ok ? organizationDomain(organization.result) : null;
  const teamMatch = audienceMatch !== true || !organization.ok || !configuredTeam || !organizationTeam
    ? null
    : configuredTeam === expectedTeamAuthDomain && organizationTeam === expectedTeamAuthDomain && configuredTeam === organizationTeam;

  return {
    audit: 'read-only-identity-join',
    settingsRead: { status: auditStatus(settings) },
    accessAppsRead: {
      audienceMatch,
      completePagination: apps.completePagination,
      matchCount,
      matchingAppRoutes: routes?.routes ?? null,
      pagination: apps.pagination,
      paginationFailureReason: apps.failureReason,
      status: apps.status,
      unsupportedShapes: Boolean(audienceBinding.unsupported || teamBinding.unsupported || apps.unsupported || routes?.unsupported),
    },
    organizationRead: { status: auditStatus(organization), teamMatch },
  };
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.log(JSON.stringify({ audit: 'unavailable', status: null }));
    process.exitCode = 1;
  } else {
    const report = await runHudRuntimeIdentityAudit({
      account: process.env.CLOUDFLARE_ACCOUNT_ID,
      token,
    });
    console.log(JSON.stringify(report));
    if (report.settingsRead.status !== 200 || report.accessAppsRead.status !== 200 || report.organizationRead.status !== 200) process.exitCode = 1;
  }
}
