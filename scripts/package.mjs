import fs from 'node:fs';
import path from 'node:path';
// Explicit entrypoints, then follow local references. Source and archives never ship.
const paths = new Set(['index.html','connect.html','apps/index.html','site.css','site.js','connect.css','connect.js','nicolas-goureau.vcf']);
const queue=[...paths];
function add(raw,base='') {
 const value=raw.replaceAll('&amp;','&');
 if (/^(?:[a-z]+:|#|\/\/)/i.test(value)) return;
 let file=path.posix.normalize(value.startsWith('/')?value.slice(1):path.posix.join(base,value.split(/[?#]/)[0]));
 if(file==='.'||file==='')file='index.html';
 if(file==='connect')file='connect.html';
 if(file==='apps'||file==='apps/')file='apps/index.html';
 if(!fs.existsSync('docs/'+file)) throw new Error(`Missing public asset: ${file}`);
 if(!paths.has(file)){paths.add(file);queue.push(file);}
}
for(let i=0;i<queue.length;i++) {
 const file=queue[i];
 if(!/\.(html|css)$/.test(file))continue;
 const text=fs.readFileSync('docs/'+file,'utf8');
 if(file.endsWith('.html'))for(const m of text.matchAll(/(?:src|href|data-shot)="([^"]+)"/g))add(m[1],path.posix.dirname(file));
 for(const m of text.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))add(m[1],path.posix.dirname(file));
}
fs.rmSync('dist',{recursive:true,force:true});
for(const file of paths){fs.mkdirSync(path.dirname('dist/'+file),{recursive:true});fs.copyFileSync('docs/'+file,'dist/'+file);}
console.log(`Packaged ${paths.size} public assets; source and portfolio archives excluded.`);
