import fs from 'node:fs';
import assert from 'node:assert/strict';
import {actions,connectPage} from './connect.mjs';
const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(packageJson.dependencies.jose,'6.2.12','JWT verifier is pinned to the vetted jose package');
assert.equal(packageJson.devDependencies.wrangler,'4.147.0','Local Worker tooling uses the current official Wrangler release');
const previewWorkerConfig=fs.readFileSync('wrangler.preview.jsonc','utf8');
assert(previewWorkerConfig.includes('"main": "worker/index.js"'),'Preview deploy runs the HUD access gate instead of static-only assets');
assert(previewWorkerConfig.includes('"run_worker_first": true'),'Preview HUD requests reach the Worker access gate before assets');
assert(previewWorkerConfig.includes('"compatibility_date": "2026-09-28"'),'Preview uses the production compatibility date');
const deployWorkflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
assert(deployWorkflow.includes("- 'worker/**'"),'Production workflow runs when Worker protection changes');
assert(deployWorkflow.includes('npx wrangler deploy --name ndgcv --keep-vars'),'Production workflow deploys the root Worker that contains the HUD gate');
for(const page of ['index.html','connect.html']) {
 const h=fs.readFileSync('dist/'+page,'utf8');
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,`${page}: duplicate IDs`);
 for(const m of h.matchAll(/href="#([^"]+)"/g))assert(ids.includes(m[1]),`${page}: missing anchor ${m[1]}`);
 for(const m of h.matchAll(/(?:src|href|data-shot)="([^"]+)"/g)){
  let file=m[1].replaceAll('&amp;','&');
  if(/^(?:[a-z]+:|#|\/\/)/i.test(file))continue;
  file=file.split(/[?#]/)[0].replace(/^\//,'');
  if(!file)file='index.html';if(file==='connect')file='connect.html';
  assert(fs.existsSync('dist/'+file),`${page}: missing asset ${file}`);
 }
 assert(!/class="(?:software-project|build-feature|build-portfolio)"|href="#project-|id="products"/.test(h),'Portfolio leaked into public page');
}
const h=fs.readFileSync('dist/index.html','utf8');
assert.equal((h.match(/class="role career-designed /g)||[]).length,8);
assert.equal((h.match(/role="tabpanel"/g)||[]).length,32);
assert.equal((h.match(/class="client-story"/g)||[]).length,12);
assert.equal((h.match(/class="build-group"/g)||[]).length,6);
assert(h.includes('id="education-heading">Education</h2>'));
assert(h.includes('section-19-aup-plaque.webp'));
assert(h.includes('I started working at twelve'));
assert(h.includes('assets/img-00-tight.png'));
const c=fs.readFileSync('dist/connect.html','utf8');
assert.equal((c.match(/class="illustrated-action /g)||[]).length,6);
assert(!c.includes('qr-'),'No QR on QR destination');
assert.equal(actions.find(a=>a.id==='references').href,'mailto:ngoureau@mac.com?subject=Reference%20request');
assert.equal(actions.find(a=>a.id==='linkedin').href,'https://www.linkedin.com/in/nicolas-goureau-6ab3237/');
assert(c.includes('download="Nicolas-Goureau.vcf"'));
const v=fs.readFileSync('dist/nicolas-goureau.vcf','utf8');
assert(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));assert(v.endsWith('END:VCARD\r\n'));
assert(v.includes('EMAIL;TYPE=INTERNET:ngoureau@mac.com\r\n'));assert(v.includes('TEL;TYPE=VOICE:+19175356425\r\n'));
const extended=connectPage([...actions,...['one','two','three'].map(id=>({id,label:'Future action '+id,href:'/',hint:'Test extension'}))]);
assert.equal((extended.match(/class="illustrated-action /g)||[]).length,9,'Action registry must extend without fixed coordinates');
const data=JSON.parse(fs.readFileSync('archive/the-agency/portfolio-data.json'));
assert.equal(data.aiProjectsData.length,7);assert.equal(data.aiMinisData.length,3);
for(const file of JSON.parse(fs.readFileSync('archive/the-agency/asset-manifest.json')))assert(fs.existsSync('archive/the-agency/assets/'+file));
assert(!fs.existsSync('dist/archive'));assert(!fs.existsSync('dist/content.json'));
console.log('Passed: packaged assets and anchors; 8 roles / 32 panels / 12 company examples; 6 build stages; Education; 6 contact actions; reference subject; LinkedIn target; vCard; extendable 9-action markup; portfolio archive. Visual responsive checks remain separate.');

assert(v.includes('item1.URL:https://www.linkedin.com/in/nicolas-goureau-6ab3237/\r\n'));
assert(!h.includes('More ways to connect'));

assert(h.includes('id="career-master"'));
assert(!/<details class="role career-designed [^>]+\sopen/.test(h));
assert.equal((h.match(/<article class="systems-group"/g)||[]).length,6);
assert.equal((h.match(/<article class="build-group"/g)||[]).length,6);
assert(h.includes('id="contact-heading">Let’s connect</h2>'));
assert(!c.includes('class="connect-footer"'));
assert.equal(actions.find(a=>a.id==='download').href,'/Nicolas_Goureau_Executive_CV.pdf');
assert(fs.readFileSync('dist/Nicolas_Goureau_Executive_CV.pdf').subarray(0,4).toString()==='%PDF');
assert(!h.includes('6 checkout lanes established'));
assert(!h.match(/<footer[\s\S]*?<\/footer>/)?.[0].includes('remote'));
const homepageNav=h.match(/<nav id="navigation"[\s\S]*?<\/nav>/)?.[0]||'';
assert(homepageNav.includes('class="private-workspace-link"'),"Homepage navigation includes the private workspace entry");
assert(homepageNav.includes('href="/hud/"'),"Private workspace entry targets the packaged HUD route");
assert(homepageNav.includes('aria-label="Open private workspace"'),"Private workspace entry has an accessible name");
assert(homepageNav.includes('href="/media/"'),"Homepage navigation includes the Media destination");
const privateWorkspaceLink=homepageNav.match(/<a class="private-workspace-link"[\s\S]*?<\/a>/)?.[0]||'';
assert(privateWorkspaceLink.includes('data-tooltip="Private workspace"'),"Private workspace entry exposes a hover and focus tooltip");
assert(privateWorkspaceLink.includes('<svg '),"Private workspace entry uses an icon, not visible link text");
assert(!/>Private workspace</.test(privateWorkspaceLink),"Private workspace entry remains visually discreet");
console.log('Document edits: collapsed career master and roles, combined approaches/stages, PDF download, contact cleanup and footer checked.');

assert.equal((h.match(/class="illustrated-action /g)||[]).length,6,"Homepage and connect share all six actions");
assert.equal((h.match(/<img[^>]* src="assets\/idea-to-sale\/[^" ]+-private-label.png"/g)||[]).length,9,"All nine distinct private-label groups are published");


const appsPage=fs.readFileSync('docs/apps/index.html','utf8');
assert(appsPage.includes('class="apps-page"'),"Apps page uses the CV-continuation shell");
assert(appsPage.includes('<span class="eyebrow">Apps</span>'),"Apps eyebrow is present");
assert(appsPage.includes('Practical tools built around real work.'),"Apps portfolio headline is present");
assert(appsPage.includes('/assets/build-process/section-18-background.webp'),"Apps parallax background is present");
assert(appsPage.includes('class="scout-widget"'),"Scout is present on the Apps page");
assert.equal((appsPage.match(/class="app-card"/g)||[]).length,9,"All nine apps are published as cards");
assert(appsPage.includes('Deal Closer Pro'));
assert(appsPage.includes('data-video-open="deal-closer-video"'),"Deal Closer Pro card has a video action");
assert(appsPage.includes('/apps/assets/deal-closer-pro-demo.mp4'),"Deal Closer Pro video is embedded");
assert(fs.existsSync('dist/apps/assets/deal-closer-pro-demo.mp4'),"Deal Closer Pro video is packaged");
assert(appsPage.includes('ImportFlow'));
assert(appsPage.includes('VendorReady'));
assert(appsPage.includes('WarrantyDesk'));
for(const name of ['RestoreFlow','FactoryQ','FranchiseOps','RentalOps','PermitPath'])assert(appsPage.includes(name));
for(const slug of ['restoreflow','factoryq','franchiseops','rentalops','permitpath']){
 assert(appsPage.includes(`/apps/${slug}/`),`${slug} demo route is listed`);
 assert(fs.existsSync(`dist/apps/assets/${slug}/preview-desktop.webp`),`${slug} desktop preview is packaged`);
 assert(fs.existsSync(`docs/apps/assets/${slug}/preview-mobile.webp`),`${slug} mobile QA preview is retained`);
}
assert.equal((appsPage.match(/No account required/g)||[]).length,9,"All nine cards disclose no-account demo access");
assert(!appsPage.includes('<footer'),"Apps page has no footer");
const appsNav=appsPage.match(/<nav id="navigation"[\s\S]*?<\/nav>/)?.[0]||'';
assert(appsNav.lastIndexOf('>Apps<') > appsNav.lastIndexOf('>Let’s connect<'),"Apps is the final navigation item");
assert(appsNav.includes('href="/media/"'),"Apps navigation links to the Media destination");
console.log('Apps page: nine demo cards, screenshots, routes, parallax shell, Scout, no footer and Apps/Media navigation checked.');

const mediaPage=fs.readFileSync('docs/media/index.html','utf8');
assert(mediaPage.includes('class="media-page"'),"Media page uses the established site shell");
assert(mediaPage.includes('A place for the work in motion.'),"Media page has its Coming soon headline");
assert(mediaPage.includes('Coming soon'),"Media page labels its availability honestly");
assert(mediaPage.includes('/illustrations/build-v3.webp'),"Media page uses an existing local brand image");
assert(mediaPage.includes('href="/apps/"'),"Media page retains the Apps destination");
assert(fs.existsSync('dist/media/index.html'),"Media page is packaged");
assert(fs.existsSync('dist/illustrations/build-v3.webp'),"Media page background image is packaged");
console.log('Media page: local brand image, responsive Coming soon shell, and existing Apps route checked.');

const hud=fs.readFileSync('dist/hud/index.html','utf8');
const hudCSS=fs.readFileSync('dist/hud/hud.css','utf8');
const hudJS=fs.readFileSync('dist/hud/hud.js','utf8');
assert(hud.includes('data-hud-preview="sample-only"'),"Career HUD is explicitly sample-only");
assert(hud.includes('Today, in focus.'),"Career HUD includes the Today view");
assert(hud.includes('Career &amp; direction'),"Career HUD includes career navigation");
assert(hud.includes('Contacts &amp; references'),"Career HUD includes relationship navigation");
assert(hud.includes('Sample data'),"Career HUD visibly labels its sample state");
assert(hud.includes('not connected'),"Career HUD honestly labels disconnected integrations");
assert(fs.existsSync('dist/hud/hud.css'),"Career HUD stylesheet is packaged");
assert(fs.existsSync('dist/hud/hud.js'),"Career HUD script is packaged");
assert(fs.existsSync('dist/hud/assets/storefront.webp'),"Career HUD retail photo remains under the protected HUD route");
assert(hudCSS.includes('prefers-reduced-motion'),"Career HUD honors reduced motion");
assert(hudJS.includes('runOnce'),"Career HUD protects duplicate actions");
assert(!hudJS.includes('fetch('),"Career HUD preview makes no network calls");
console.log('Career HUD: packaged /hud/ preview, actual retail photo asset, sample-only state, reduced motion, and local-only interaction checks passed.');
