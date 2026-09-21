// A self-contained review artifact; never deployed as the production page.
import fs from 'node:fs';
import path from 'node:path';
const mime={'.webp':'image/webp','.png':'image/png','.vcf':'text/vcard'};
const data=file=>`data:${mime[path.extname(file)]};base64,${fs.readFileSync('docs/'+file).toString('base64')}`;
let html=fs.readFileSync('docs/connect.html','utf8');
let css=fs.readFileSync('docs/connect.css','utf8').replaceAll("url('/illustrations/43.webp')",`url('${data('illustrations/43.webp')}')`);
html=html.replace('<link rel="stylesheet" href="/connect.css">',`<style>${css}</style>`).replace('<script src="/connect.js" defer></script>',`<script defer>${fs.readFileSync('docs/connect.js','utf8')}</script>`);
// Inline script must run after the DOM exists in a standalone file.
html=html.replace('<script defer>','<script>document.addEventListener("DOMContentLoaded",()=>{').replace('</script>','});</script>');
html=html.replace(/src="\/([^"]+)"/g,(_,file)=>`src="${data(file)}"`);
html=html.replace('href="/nicolas-goureau.vcf"',`href="${data('nicolas-goureau.vcf')}"`).replaceAll('href="/"','href="https://nicolasgoureau.com/"');
fs.writeFileSync('../Nicolas-Goureau-Connect-Preview.html',html);
console.log('Exported self-contained contact preview.');
