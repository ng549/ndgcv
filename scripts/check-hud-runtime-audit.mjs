import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/audit-hud-runtime.yml', 'utf8');
assert(workflow.includes('workflow_dispatch:'), 'The runtime audit is manually dispatched only.');
assert(!/^\s*push:/m.test(workflow), 'The runtime audit never runs automatically on a branch push.');
assert(workflow.includes('contents: read'), 'The audit uses only repository read permission.');
assert(!workflow.includes('wrangler deploy'), 'The runtime audit cannot deploy a Worker.');
assert(!workflow.includes('POST ') && !workflow.includes('PUT ') && !workflow.includes('PATCH ') && !workflow.includes('DELETE '), 'The runtime audit contains no mutation HTTP method.');
assert(workflow.includes('workers/domains'), 'The runtime audit checks only the deployed custom-domain Worker identity.');
assert(workflow.includes('workers/scripts/ndgcv/settings'), 'The runtime audit reads only root Worker settings.');
assert(workflow.includes('access/apps?per_page=100'), 'The runtime audit reads Access application routes without policies.');
assert(workflow.includes("'HUD_BACKEND_ORIGIN'"), 'The runtime audit reports the fixed backend-origin binding state.');
assert(workflow.includes('routeCoverage'), 'The runtime audit reports only route-coverage booleans.');
assert(!workflow.includes('JSON.stringify(settings.result'), 'The runtime audit never prints complete Worker settings.');
assert(!workflow.includes('JSON.stringify(accessApps.result'), 'The runtime audit never prints Access applications or policies.');
console.log('HUD runtime audit workflow: manual-only, read-only, and sanitized.');
