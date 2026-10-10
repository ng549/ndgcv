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
  'media-os': 'MediaOS', 'sourcing-os': 'SourcingOS', 'appdev-os': 'AppDevOS',
})) {
  assert(hud.includes(`data-view="${view}"`), `HUD navigation exposes the ${label} view.`);
  assert(hud.includes(`data-view-panel="${view}"`), `HUD contains a matching ${label} panel.`);
}
for (const category of ['Interviews', 'Networking', 'Client work', 'Sourcing', 'Personal', 'Focus']) {
  assert(hud.includes(`>${category}</li>`), `HUD shows the ${category} calendar category.`);
}
assert(hud.includes('<h2 id="calendar-heading">Calendar</h2>') && hud.includes('<h2 id="email-heading">Email</h2>'), 'Calendar and Email use direct, readable panel titles.');
assert(hud.includes('Current implementation order'), 'Readiness is presented as current implementation order.');
assert(hud.includes('Protected source when available'), 'Readiness labels live-source availability truthfully.');
assert(hud.includes('data-label="Verified"') && hud.includes('data-label="Source"'), 'Readiness cells carry responsive labels rather than relying on clipped table headers.');
assert(hud.includes('No applications</h3>'), 'Application capture does not invent an application history.');
assert(hud.includes('No interview plans</h3>') && hud.includes('No offers to review'), 'Interview and offer views remain empty until connected.');
assert(hud.includes('No personal data</h3>') && hud.includes('No research source</h3>'), 'Module entry screens avoid claiming private data or search results.');
assert(hud.includes('aria-label="Later app entry points"'), 'Later app navigation is grouped separately from connected workspace sections.');
assert(hud.includes('data-view-panel="media-os"') && hud.includes('data-view-panel="sourcing-os"') && hud.includes('data-view-panel="appdev-os"'), 'Later app panels remain available without claiming engines, integrations, or live records.');
assert(hud.includes('id="readiness-contacts-source"') && !hud.includes('<tr><th scope="row">Contacts &amp; ReferenceSheet</th><td>Built</td><td>Not connected</td>'), 'Readiness does not hardcode contacts as globally disconnected.');
assert(!hud.includes('Connected to Gmail') && !hud.includes('Connected to iCloud'), 'Unwired sources are not represented as connected.');
assert(js.includes('const HUD_VIEWS'), 'HUD has an allowlisted view registry.');
for (const view of ['media-os', 'sourcing-os', 'appdev-os']) assert(js.includes(`'${view}'`), `HUD registry allowlists ${view}.`);
assert(js.includes('function renderReadiness()') && js.includes('Protected source connected'), 'Readiness derives contact source state from the existing reference adapter.');
assert(js.includes('window.addEventListener(\'popstate\''), 'HUD restores view selection from browser history.');
assert(js.includes('window.addEventListener(\'hashchange\''), 'HUD accepts a verified hash view without opening arbitrary panels.');
assert(css.includes('CV-aligned HUD shell'), 'HUD has the CV-aligned style layer.');
assert(css.includes('width: 224px') && css.includes('background: var(--hud-cv-charcoal)'), 'Desktop HUD uses the public-site-style charcoal rail.');
assert(css.includes('max-height: calc(100dvh - 68px)'), 'Mobile HUD menu is bounded below the 68px top bar.');
assert(css.includes('min-height: 44px'), 'HUD controls preserve touch target sizing.');
assert(css.includes('background: #293e4c') && css.includes('border-color: #526774') && css.includes('background: #2d4757'), 'HUD section bands, cards, and selections retain the reviewed dark CV contrast palette.');
assert(css.includes('aspect-ratio: 3 / 2') && css.includes('object-fit: contain') && css.includes('object-position: 50% 50%'), 'Private photo frame preserves whole portrait or landscape images in the reviewed 3:2 viewport.');
assert(hud.includes('Manrope:wght@400;500;600;650;700;750;800') && hud.includes('Source+Sans+3:wght@400;600;700'), 'HUD imports every CV heading/navigation and body/form font weight it uses.');
assert(css.includes('dialog#hud-dialog'), 'The actual HUD dialog element receives the CV dark-theme selector.');
assert(css.includes('worker_transport_failure') === false, 'Visual styles do not interpolate private connection diagnostics.');
assert(css.includes('max-width: 1280px') && css.includes('.today-grid { grid-template-columns: minmax(0, 1fr);'), 'Today stacks deliberately at tablet widths instead of crowding its controls.');
console.log('HUD full interface: CV shell, view coverage, truthful empty states, and responsive navigation checked.');
