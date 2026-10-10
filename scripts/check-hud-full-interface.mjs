import assert from 'node:assert/strict';
import fs from 'node:fs';

const hud = fs.readFileSync('dist/hud/index.html', 'utf8');
const css = fs.readFileSync('dist/hud/hud.css', 'utf8');
const js = fs.readFileSync('dist/hud/hud.js', 'utf8');

for (const [view, label] of Object.entries({
  today: 'Today', calendar: 'Calendar', email: 'Email', career: 'Opportunities',
  contacts: 'Contacts &amp; references', applications: 'Applications', interviews: 'Interviews &amp; offers',
  materials: 'Materials', direction: 'Career direction', readiness: 'Readiness',
  'paid-work': 'Paid work', personal: 'Personal', scout: 'Scout',
})) {
  assert(hud.includes(`data-view="${view}"`), `HUD navigation exposes the ${label} view.`);
  assert(hud.includes(`data-view-panel="${view}"`), `HUD contains a matching ${label} panel.`);
}
for (const category of ['Interviews', 'Networking', 'Client work', 'Sourcing', 'Personal', 'Focus']) {
  assert(hud.includes(`>${category}</li>`), `HUD shows the ${category} calendar category.`);
}
assert(hud.includes('iCloud Calendar is the planned default source'), 'Calendar names iCloud as its planned default without claiming connection.');
assert(hud.includes('Gmail and iCloud Mail'), 'Email names its planned sources without loading messages.');
assert(hud.includes('Current implementation order'), 'Readiness is presented as current implementation order.');
assert(hud.includes('Protected source when available'), 'Readiness labels live-source availability truthfully.');
assert(hud.includes('No applications are connected'), 'Application capture does not invent an application history.');
assert(hud.includes('No interview plans yet') && hud.includes('No offers to review'), 'Interview and offer views remain empty until connected.');
assert(hud.includes('No personal data is shown') && hud.includes('Scout is not searching yet'), 'Module entry screens avoid claiming private data or search results.');
assert(!hud.includes('Connected to Gmail') && !hud.includes('Connected to iCloud'), 'Unwired sources are not represented as connected.');
assert(js.includes('const HUD_VIEWS'), 'HUD has an allowlisted view registry.');
assert(js.includes('window.addEventListener(\'popstate\''), 'HUD restores view selection from browser history.');
assert(js.includes('window.addEventListener(\'hashchange\''), 'HUD accepts a verified hash view without opening arbitrary panels.');
assert(css.includes('CV-aligned HUD shell'), 'HUD has the CV-aligned style layer.');
assert(css.includes('width: 224px') && css.includes('background: var(--hud-cv-charcoal)'), 'Desktop HUD uses the public-site-style charcoal rail.');
assert(css.includes('max-height: calc(100dvh - 68px)'), 'Mobile HUD menu is bounded below the 68px top bar.');
assert(css.includes('min-height: 44px'), 'HUD controls preserve touch target sizing.');
console.log('HUD full interface: CV shell, view coverage, truthful empty states, and responsive navigation checked.');
