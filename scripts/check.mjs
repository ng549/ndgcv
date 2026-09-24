import fs from 'node:fs';
import assert from 'node:assert/strict';
import {actions,connectPage} from './connect.mjs';
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
console.log('Document edits: collapsed career master and roles, combined approaches/stages, PDF download, contact cleanup and footer checked.');

assert.equal((h.match(/class="illustrated-action /g)||[]).length,6,"Homepage and connect share all six actions");
assert.equal((h.match(/<img[^>]* src="assets\/idea-to-sale\/[^" ]+-private-label.png"/g)||[]).length,9,"All nine distinct private-label groups are published");


const appsPage=fs.readFileSync('docs/apps/index.html','utf8');
assert(appsPage.includes('ImportFlow'));
assert(appsPage.includes('VendorReady'));
assert(appsPage.includes('WarrantyDesk'));
assert(appsPage.includes('https://importflow-lcawpq.v2.appdeploy.ai/'));
assert(appsPage.includes('https://vendorready-50e9yr.v2.appdeploy.ai/'));
assert(appsPage.includes('https://warrantydesk-afzqxn.v2.appdeploy.ai/'));
assert(appsPage.includes('GOOGLE + EMAIL SIGN-IN'));
assert(appsPage.includes('Production desktop QA'));
assert(appsPage.includes('Production mobile QA'));
console.log('Apps page: all three live apps, sign-in disclosure and desktop/mobile QA screenshots checked.');
