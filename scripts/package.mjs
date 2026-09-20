import fs from 'node:fs';
import path from 'node:path';
const html=fs.readFileSync('docs/index.html','utf8');
const paths=new Set(['index.html','site.css','site.js']);
// Section 14 diagram background is referenced from its stylesheet.
paths.add('illustrations/section14-workspace-background-v2.webp');
// Section 17 full-section background is referenced in its stylesheet.
paths.add('assets/systems/section-17-background.webp');
paths.add('assets/education/section-19-background.webp');
for(const match of html.matchAll(/(?:src|href|data-shot)="([^"#]+)"/g)){
 const file=match[1].replaceAll('&amp;','&');
 if(!/^(?:https?:|mailto:|tel:)/.test(file)&&fs.existsSync('docs/'+file))paths.add(file);
}
// Card artwork is referenced by inline CSS, so it must ship alongside img assets.
for(const match of html.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){
 const file=match[1].replaceAll('&amp;','&');
 if(!/^(?:https?:|data:)/.test(file)){
  if(!fs.existsSync('docs/'+file))throw new Error(`Missing background asset: ${file}`);
  paths.add(file);
 }
}
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
for(const file of paths){fs.mkdirSync(path.dirname('dist/'+file),{recursive:true});fs.copyFileSync('docs/'+file,'dist/'+file)}
console.log(`Packaged ${paths.size} public site assets.`);

fs.mkdirSync('dist/assets/build-process',{recursive:true});
fs.copyFileSync('docs/assets/build-process/section-18-background.webp','dist/assets/build-process/section-18-background.webp');
