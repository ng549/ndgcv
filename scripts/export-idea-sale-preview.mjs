// Section-only review export; production source remains unchanged by export.
import fs from 'node:fs';
const data=file=>`data:image/${file.endsWith(".png")?"png":"webp"};base64,${fs.readFileSync('dist/'+file).toString('base64')}`;
const page=fs.readFileSync('dist/index.html','utf8');
let section=page.match(/<section class="brand-story idea-sale-section"[\s\S]*?<\/section>/)[0];
section=section.replace(/src="([^\"]+)"/g,(_,file)=>`src="${data(file)}"`);
section=section.replace(/href="#role-([^\"]+)"/g,'href="https://nicolasgoureau.com/#role-$1" target="_blank" rel="noopener"');
section=section.replace(/href="assets\/idea-to-sale\/[^\"]+"/g,'href="#"');
const css=fs.readFileSync('dist/site.css','utf8').replace(/url\(['"]?([^'"\)]+)['"]?\)/g,'none');
let head=page.slice(0,page.indexOf('<body>')).replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link rel="stylesheet" href="site.css[^\"]*">/,()=>`<style>${css}</style>`).replace('<title>Nicolas Goureau — Retail, Systems & Tools</title>','<title>From idea to sale — Review preview</title>');
const js=`const section=document.getElementById('product-journey');section.dataset.collapsible='';const bar=document.createElement('div');bar.className='section-bar';const label=document.createElement('span');label.textContent='From idea to sale';const button=document.createElement('button');button.type='button';button.className='section-toggle';button.textContent='Minimize −';button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Minimize From idea to sale');button.addEventListener('click',()=>{const closed=section.classList.toggle('is-minimized');button.textContent=closed?'Expand +':'Minimize −';button.setAttribute('aria-expanded',String(!closed));button.setAttribute('aria-label',(closed?'Expand':'Minimize')+' From idea to sale');});bar.append(label,button);section.prepend(bar);document.querySelectorAll('.idea-image').forEach(a=>a.href=a.querySelector('img').src);`;
const html=head+`<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="wordmark" href="https://nicolasgoureau.com/">Nicolas Goureau</a><nav aria-label="Preview navigation"><a href="#product-journey">From idea to sale</a></nav></header><main id="main">${section}</main><script>${js}</script></body></html>`;
fs.writeFileSync('../Nicolas-Goureau-From-Idea-to-Sale-Preview.html',html);
console.log('Exported section-only preview with embedded images/styles; career links open the live CV. Webfonts use the existing font service or fallbacks. Production parallax is not simulated in this export.');
