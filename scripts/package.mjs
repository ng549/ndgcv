import fs from 'node:fs';
import path from 'node:path';
const html=fs.readFileSync('docs/index.html','utf8');
const paths=new Set(['index.html','site.css','site.js']);
for(const match of html.matchAll(/(?:src|href|data-shot)="([^"#]+)"/g)){
 const file=match[1].replaceAll('&amp;','&');
 if(!/^(?:https?:|mailto:|tel:)/.test(file)&&fs.existsSync('docs/'+file))paths.add(file);
}
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
for(const file of paths){fs.mkdirSync(path.dirname('dist/'+file),{recursive:true});fs.copyFileSync('docs/'+file,'dist/'+file)}
console.log(`Packaged ${paths.size} public site assets.`);
