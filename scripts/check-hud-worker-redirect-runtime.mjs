import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';

async function runRedirectProbe(redirect) {
  const outbound = [];
  const miniflare = new Miniflare({
    workers: [{
      config: {
        compatibilityDate: '2026-09-28',
        compatibilityFlags: ['nodejs_compat'],
        manifest: {
          mainModule: 'redirect-probe.mjs',
          modulesRoot: process.cwd(),
          modules: {
            'redirect-probe.mjs': {
              type: 'esm',
              contents: `export default { async fetch() { try { const upstream = await fetch('https://agency-nexus-command.fly.dev/private', { redirect: '${redirect}' }); return new Response(String(upstream.status)); } catch (error) { return new Response('caught:' + error.message, { status: 599 }); } } };`,
            },
          },
        },
        name: 'hud-redirect-probe',
      },
      dev: {
        outboundService: {
          handler: async request => {
            outbound.push(request.url);
            return new Response('private redirect bytes', {
              headers: { Location: 'https://attacker.invalid/private' },
              status: 302,
            });
          },
          type: 'fetcher',
        },
      },
    }],
  });
  try {
    const response = await miniflare.dispatchFetch('https://nicolasgoureau.com/');
    return { body: await response.text(), outbound, status: response.status };
  } finally {
    await miniflare.dispose();
  }
}

const manual = await runRedirectProbe('manual');
assert.equal(manual.status, 200, 'workerd accepts a manual redirect policy.');
assert.equal(manual.body, '302', 'workerd returns the intercepted redirect to the Worker for explicit handling.');
assert.deepEqual(manual.outbound, ['https://agency-nexus-command.fly.dev/private'], 'Manual mode makes only the fixed first-hop request.');

const unsupported = await runRedirectProbe('error');
assert.equal(unsupported.status, 599, 'workerd rejects redirect:error rather than treating it as a supported redirect policy.');
assert.match(unsupported.body, /Invalid redirect value/, 'workerd reports the redirect:error incompatibility.');
assert.equal(unsupported.outbound.length, 0, 'An unsupported redirect policy fails before any outbound request.');

console.log('Career HUD worker redirect runtime: workerd requires manual redirect handling and never follows the probe redirect.');
