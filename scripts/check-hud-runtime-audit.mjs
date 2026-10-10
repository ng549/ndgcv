import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runHudRuntimeIdentityAudit } from './audit-hud-runtime-identity.mjs';

const workflow = fs.readFileSync('.github/workflows/audit-hud-runtime.yml', 'utf8');
const targetAudience = 'synthetic-hud-audience';
const expectedTeam = 'https://billowing-darkness-b12a.cloudflareaccess.com';
const organization = { auth_domain: 'billowing-darkness-b12a.cloudflareaccess.com' };
const pageInfo = ({ count = 0, page = 1, totalCount = count, totalPages = 1 } = {}) => ({
  count,
  page,
  per_page: 100,
  total_count: totalCount,
  total_pages: totalPages,
});

function settingsResponse(bindings = [
  { name: 'HUD_ACCESS_AUD', text: targetAudience },
  { name: 'HUD_ACCESS_TEAM_DOMAIN', text: expectedTeam },
]) {
  return { bindings };
}

function jsonResponse(result, resultInfo) {
  return new Response(JSON.stringify({ result, result_info: resultInfo, success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status) {
  return new Response(JSON.stringify({ success: false }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function auditFetch({ appsPages, organizationResult = organization, organizationStatus = 200, settings = settingsResponse(), zoneAppsPages = appsPages }) {
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    calls.push({ method: init?.method, pathname: url.pathname, search: url.search });
    assert.equal(init?.method, 'GET', 'The audit performs only GET requests.');
    assert.equal(url.origin, 'https://api.cloudflare.com', 'The audit has a fixed Cloudflare API origin.');
    if (url.pathname.endsWith('/workers/scripts/ndgcv/settings')) return jsonResponse(settings);
    if (url.pathname.endsWith('/access/organizations')) return organizationStatus === 200 ? jsonResponse(organizationResult) : errorResponse(organizationStatus);
    if (url.pathname.endsWith('/access/apps')) {
      const page = Number(url.searchParams.get('page'));
      assert.equal(url.searchParams.get('per_page'), '100', 'Access app pages are bounded to 100 records.');
      const item = url.pathname.includes('/zones/84d2ac9d51a9fcf04f7ef0b1a01ff85c/')
        ? zoneAppsPages[page - 1]
        : appsPages[page - 1];
      if (!item) return errorResponse(404);
      return jsonResponse(item.result, item.resultInfo);
    }
    throw new Error(`Unexpected audit path: ${url.pathname}`);
  };
  return { calls, fetchImpl };
}

async function audit(options) {
  const mock = auditFetch(options);
  const report = await runHudRuntimeIdentityAudit({ account: 'synthetic-account', fetchImpl: mock.fetchImpl, token: 'masked-test-token' });
  return { ...mock, report };
}

const zero = await audit({
  appsPages: [{ result: [], resultInfo: pageInfo() }],
});
assert.equal(zero.report.accessAppsRead.completePagination, true, 'A verified complete empty page is conclusive.');
assert.equal(zero.report.accessAppsRead.paginationFailureReason, null, 'A documented empty result with complete pagination metadata is a valid empty list.');
assert.deepEqual(
  zero.report.accessAppsRead.pagination,
  { accumulatedCount: 0, count: 0, page: 1, per_page: 100, resultIsArray: true, total_count: 0, total_pages: 1 },
  'Successful pagination exposes only numeric metadata and the result-array shape.'
);
assert.equal(zero.report.accessAppsRead.matchCount, 0, 'A complete app list can conclusively report zero audience matches.');
assert.equal(zero.report.accessAppsRead.audienceMatch, false, 'No exact app audience match is not mistaken for coverage.');
assert.equal(zero.report.organizationRead.teamMatch, null, 'Team association is unknown without a unique matching HUD app.');
assert.equal(zero.calls.filter(call => call.pathname.endsWith('/access/organizations')).length, 1, 'The organization read remains a fixed audit fact.');

const zoneScoped = await audit({
  appsPages: [{ result: [], resultInfo: pageInfo() }],
  zoneAppsPages: [{
    result: [{
      aud: targetAudience,
      destinations: [
        { uri: 'https://nicolasgoureau.com/hud/*' },
        { uri: 'https://nicolasgoureau.com/api/hud' },
        { uri: 'https://private.example/hud/*' },
      ],
      domain: 'nicolasgoureau.com',
      id: 'never-emit-app-id',
      path: '/hud',
      policy: 'never-emit-policy',
      self_hosted_domains: ['www.nicolasgoureau.com'],
    }],
    resultInfo: pageInfo({ count: 1 }),
  }],
});
assert.equal(zoneScoped.report.accessAppsRead.audienceMatch, false, 'The account-level result remains independent from the zone-scoped result.');
assert.equal(zoneScoped.report.zoneAccessAppsRead.audienceMatch, true, 'The zone-scoped list joins only the configured HUD audience in memory.');
assert.deepEqual(
  zoneScoped.report.zoneAccessAppsRead.matchingAppRoutes,
  {
    domain: 'nicolasgoureau.com/hud',
    destinations: ['https://nicolasgoureau.com/hud/*', 'https://nicolasgoureau.com/api/hud'],
    omittedRouteCount: 1,
    selfHostedDomains: ['www.nicolasgoureau.com/hud'],
  },
  'Zone output contains only public HUD/API route evidence from the matched app.'
);
assert.equal(zoneScoped.report.organizationRead.teamMatch, true, 'The organization match is based on the zone-scoped HUD app identity.');
assert(zoneScoped.calls.some(call => call.pathname.endsWith('/zones/84d2ac9d51a9fcf04f7ef0b1a01ff85c/access/apps')), 'The audit reads the fixed deployed CV zone Access-app endpoint.');
assert(!JSON.stringify(zoneScoped.report).includes('never-emit-app-id'), 'Zone app IDs are never emitted.');
assert(!JSON.stringify(zoneScoped.report).includes('never-emit-policy'), 'Zone policies are never emitted.');
assert(!JSON.stringify(zoneScoped.report).includes(targetAudience), 'The configured Access audience remains in memory only for the zone join.');

const malformedZoneZeroPage = await audit({
  appsPages: [{ result: [], resultInfo: pageInfo() }],
  zoneAppsPages: [{ result: [], resultInfo: pageInfo({ count: 1, totalCount: 0, totalPages: 0 }) }],
});
assert.equal(malformedZoneZeroPage.report.zoneAccessAppsRead.completePagination, null, 'Zone-scoped malformed zero-page metadata remains unknown.');
assert.equal(malformedZoneZeroPage.report.zoneAccessAppsRead.paginationFailureReason, 'invalid_total_pages', 'Zone-scoped pagination follows the strict empty-list rule.');

const zeroPageEmpty = await audit({
  appsPages: [{ result: [], resultInfo: pageInfo({ count: 0, totalCount: 0, totalPages: 0 }) }],
});
assert.equal(zeroPageEmpty.report.accessAppsRead.completePagination, true, 'Cloudflare\'s exact zero-page empty-list envelope is a conclusive empty result.');
assert.equal(zeroPageEmpty.report.accessAppsRead.matchCount, 0, 'The exact zero-page empty-list envelope has no HUD audience match.');
assert.equal(zeroPageEmpty.report.accessAppsRead.paginationFailureReason, null, 'The exact zero-page empty-list envelope is not treated as malformed.');
assert.deepEqual(
  zeroPageEmpty.report.accessAppsRead.pagination,
  { accumulatedCount: 0, count: 0, page: 1, per_page: 100, resultIsArray: true, total_count: 0, total_pages: 0 },
  'The accepted zero-page envelope still emits only sanitized numeric metadata.'
);

const malformedZeroPageCount = await audit({
  appsPages: [{ result: [], resultInfo: pageInfo({ count: 1, totalCount: 0, totalPages: 0 }) }],
});
assert.equal(malformedZeroPageCount.report.accessAppsRead.completePagination, null, 'A zero-page envelope with a nonzero count remains unknown.');
assert.equal(malformedZeroPageCount.report.accessAppsRead.paginationFailureReason, 'invalid_total_pages', 'A near-match zero-page envelope is rejected with a fixed reason.');

const malformedZeroPageItems = await audit({
  appsPages: [{ result: [{ aud: targetAudience }], resultInfo: pageInfo({ count: 1, totalCount: 1, totalPages: 0 }) }],
});
assert.equal(malformedZeroPageItems.report.accessAppsRead.completePagination, null, 'A zero-page envelope with an item remains unknown.');
assert.equal(malformedZeroPageItems.report.accessAppsRead.paginationFailureReason, 'invalid_total_pages', 'A nonempty zero-page envelope is never accepted as complete.');

const multiple = await audit({
  appsPages: [{
    result: [{ aud: targetAudience }, { aud: targetAudience }],
    resultInfo: pageInfo({ count: 2, totalCount: 2 }),
  }],
});
assert.equal(multiple.report.accessAppsRead.matchCount, 2, 'A complete app list retains the number of matching audiences.');
assert.equal(multiple.report.accessAppsRead.audienceMatch, false, 'Multiple matching audiences are ambiguous rather than treated as the HUD app.');
assert.equal(multiple.report.accessAppsRead.matchingAppRoutes, null, 'Ambiguous apps never emit any routes.');

const missingPagination = await audit({
  appsPages: [{ result: [], resultInfo: {} }],
});
assert.equal(missingPagination.report.accessAppsRead.completePagination, null, 'Missing pagination metadata is explicitly unknown.');
assert.equal(missingPagination.report.accessAppsRead.paginationFailureReason, 'empty_result_missing_pagination', 'An empty result without the documented pagination envelope stays unknown with a fixed diagnosis.');
assert.deepEqual(
  missingPagination.report.accessAppsRead.pagination,
  { accumulatedCount: 0, count: 'undefined', page: 'undefined', per_page: 'undefined', resultIsArray: true, total_count: 'undefined', total_pages: 'undefined' },
  'Malformed pagination exposes field types rather than raw values.'
);
assert.equal(missingPagination.report.accessAppsRead.matchCount, null, 'An incomplete list never claims absence or uniqueness.');
assert.equal(missingPagination.report.accessAppsRead.unsupportedShapes, true, 'Unsupported pagination is recorded without logging raw API data.');

const nonArrayResult = await audit({
  appsPages: [{ result: { private: 'never emitted' }, resultInfo: pageInfo() }],
});
assert.equal(nonArrayResult.report.accessAppsRead.completePagination, null, 'A non-array Access result remains unknown.');
assert.equal(nonArrayResult.report.accessAppsRead.paginationFailureReason, 'result_not_array', 'Non-array Access results have a fixed diagnostic.');
assert.equal(nonArrayResult.report.accessAppsRead.pagination.resultIsArray, false, 'The result shape is exposed without serializing any result data.');
assert(!JSON.stringify(nonArrayResult.report).includes('never emitted'), 'Malformed Access result content is never emitted.');

const truncated = await audit({
  appsPages: [{
    result: [],
    resultInfo: pageInfo({ count: 0, totalCount: 1_001, totalPages: 11 }),
  }],
});
assert.equal(truncated.report.accessAppsRead.completePagination, false, 'The audit explicitly reports a list exceeding its ten-page bound as truncated.');
assert.equal(truncated.report.accessAppsRead.paginationFailureReason, 'page_limit_exceeded', 'A bounded list reports its fixed truncation reason.');
assert.equal(truncated.report.accessAppsRead.audienceMatch, null, 'A truncated list cannot establish a unique HUD app.');

const organization403 = await audit({
  appsPages: [{
    result: [{ aud: targetAudience, domain: 'nicolasgoureau.com', path: '/hud/*' }],
    resultInfo: pageInfo({ count: 1 }),
  }],
  organizationStatus: 403,
});
assert.equal(organization403.report.accessAppsRead.audienceMatch, true, 'The exact audience join succeeds independently of organization read permission.');
assert.equal(organization403.report.organizationRead.status, 403, 'Organization authorization failure is retained as a status only.');
assert.equal(organization403.report.organizationRead.teamMatch, null, 'Organization 403 produces unknown rather than a false team mismatch.');

const publicRoutes = await audit({
  appsPages: [{
    result: [{
      aud: targetAudience,
      domain: 'nicolasgoureau.com',
      destinations: [
        { public: true, type: 'public', uri: 'https://nicolasgoureau.com/api/hud/*' },
        { public: true, type: 'legacy', uri: 'www.nicolasgoureau.com/hud/*' },
        { public: false, type: 'private', uri: 'https://private.example/hud/*' },
      ],
      path: '/hud',
      self_hosted_domains: ['www.nicolasgoureau.com', 'internal.example'],
    }],
    resultInfo: pageInfo({ count: 1 }),
  }],
});
assert.deepEqual(
  publicRoutes.report.accessAppsRead.matchingAppRoutes,
  {
    domain: 'nicolasgoureau.com/hud',
    destinations: [
      'https://nicolasgoureau.com/api/hud/*',
      'www.nicolasgoureau.com/hud/*',
    ],
    omittedRouteCount: 2,
    selfHostedDomains: ['www.nicolasgoureau.com/hud'],
  },
  'Only known public HUD routes from the unique audience-matched app are emitted; wildcard and legacy destination facts survive.'
);
assert(!JSON.stringify(publicRoutes.report).includes('private.example'), 'Private hosts are omitted from the audit output.');
assert(!JSON.stringify(publicRoutes.report).includes(targetAudience), 'The Access audience is used in memory only.');
assert.equal(publicRoutes.report.organizationRead.teamMatch, true, 'The organization domain must agree with both the configured and expected team domain.');

assert(workflow.includes('workflow_dispatch:'), 'The runtime audit is manually dispatched only.');
assert(!/^\s*push:/m.test(workflow), 'The runtime audit never runs automatically on a branch push.');
assert(workflow.includes('contents: read'), 'The audit uses only repository read permission.');
assert(workflow.includes('node scripts/audit-hud-runtime-identity.mjs'), 'The manual job runs the reviewed identity join implementation.');
assert(!workflow.includes('wrangler deploy'), 'The runtime audit cannot deploy a Worker.');
assert(!workflow.includes('workers/domains'), 'The identity audit does not infer Access identity from general Worker domain coverage.');

const implementation = fs.readFileSync('scripts/audit-hud-runtime-identity.mjs', 'utf8');
assert(implementation.includes("method: 'GET'"), 'Every Cloudflare request is explicitly GET-only.');
assert(implementation.includes('maxAppPages = 10') && implementation.includes('appPageSize = 100'), 'Access pagination is bounded to ten 100-record pages.');
assert(implementation.includes('access/organizations'), 'The audit reads the account Access organization for an exact team comparison.');
assert(implementation.includes('app.aud === audience'), 'The audit joins only apps with the configured HUD Access audience in memory.');
assert(implementation.includes('readApps(`zones/${hudZoneId}`)'), 'The audit reads the fixed deployed CV zone Access-app endpoint.');
assert(implementation.includes('exactZeroPageEmptyList'), 'Only the exact documented zero-page empty-list envelope is accepted without relaxing malformed pagination checks.');
assert(implementation.includes('sanitizedPagination') && implementation.includes('paginationFailureReason'), 'Pagination failures expose a fixed reason plus sanitized metadata only.');
assert(implementation.includes('knownPublicHosts') && implementation.includes('omittedRouteCount'), 'Only permitted public routes are emitted and omitted routes are counted.');
assert(!implementation.includes('app.name') && !implementation.includes('app.id') && !implementation.includes('policy'), 'The audit never selects or emits app names, IDs, or policies.');

console.log('HUD runtime identity audit: bounded, GET-only audience/team join with sanitized public HUD routes verified.');
