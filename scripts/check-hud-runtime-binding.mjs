import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
const rootDeploy = 'npx wrangler deploy --name ndgcv --keep-vars --var HUD_BACKEND_ORIGIN:https://agency-nexus-command.fly.dev';

assert(workflow.includes(rootDeploy), 'Root ndgcv deploy preserves existing bindings and supplies only the approved backend origin.');
assert.equal((workflow.match(/--var\s+HUD_BACKEND_ORIGIN:https:\/\/agency-nexus-command\.fly\.dev/g) || []).length, 1, 'The approved backend origin is injected once, only for the root Worker deploy.');
assert(workflow.includes('run: npx wrangler deploy --keep-vars\n'), 'Apps Worker deployment remains unchanged.');
assert(!workflow.includes('wrangler secret put'), 'The release workflow does not alter secrets.');
assert(!workflow.includes('wrangler delete'), 'The release workflow does not remove Worker configuration.');

console.log('HUD runtime binding release: root Worker keeps existing variables and adds only the approved backend origin.');
