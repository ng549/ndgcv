import fs from 'node:fs';
import assert from 'node:assert/strict';
const h=fs.readFileSync('docs/index.html','utf8');
const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate section IDs');
for(const m of h.matchAll(/href="#([^"]+)"/g))assert(ids.includes(m[1]),`Missing anchor ${m[1]}`);
for(const m of h.matchAll(/(?:src|data-shot)="([^"]+)"/g)){
 if(!m[1].startsWith('http'))assert(fs.existsSync('docs/'+m[1].replaceAll('&amp;','&')),`Missing image ${m[1]}`);
}
assert.equal((h.match(/class="role"/g)||[]).length,8);
assert.equal((h.match(/class="software-project"/g)||[]).length,7);
assert(h.includes('ATLANTA, GA')&&h.includes('Willing to travel'));
assert(h.includes('I started working at twelve'));
assert(h.includes('assets/img-00-tight.png'));
console.log('Passed: image files, section links, career/project counts, portrait and approved location/history.');
