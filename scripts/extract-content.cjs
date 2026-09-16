const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const context = { DCLogic: class {} };
vm.createContext(context);
vm.runInContext(script + ';this.content = new Component()', context);
const keys = ['rolesData','tracksData','highlightsData','compGroupsData','plWallData','plFlowData','aiProjectsData','aiMinisData','aiFlowData','aiStoryData'];
fs.writeFileSync('docs/content.json', JSON.stringify(Object.fromEntries(keys.map(k => [k, context.content[k]])), null, 2) + '\n');
