import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('docs/hud/index.html', 'utf8');
const css = fs.readFileSync('docs/hud/hud.css', 'utf8');

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) => channel <= .04045
    ? channel / 12.92
    : ((channel + .055) / 1.055) ** 2.4);
  return .2126 * red + .7152 * green + .0722 * blue;
}

function contrast(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (light + .05) / (dark + .05);
}

assert(contrast('22262b', 'efede6') >= 4.5, 'HUD ink must meet normal-text contrast on ivory.');
assert(contrast('3f5668', 'efede6') >= 4.5, 'HUD supporting copy must meet normal-text contrast on ivory.');
assert(contrast('efede6', '14232e') >= 4.5, 'HUD ivory must meet normal-text contrast on navy.');
assert(contrast('8fb0d8', '14232e') >= 3, 'HUD focus accent must remain visible on navy.');

const heroIndex = html.indexOf('<header class="hero"');
const photoIndex = html.indexOf('private-photo-hero');
const mobileMenuEnd = html.indexOf('</div>\n    </aside>');
assert(heroIndex >= 0 && photoIndex > heroIndex, 'The protected photo belongs in the hero, after the navigation.');
assert(photoIndex > mobileMenuEnd, 'The protected photo must not be inside the mobile navigation drawer.');
assert(css.includes('font: 400 18px/1.6 "Source Sans 3", sans-serif'), 'HUD body copy must use the public site body font.');
assert(css.includes('font-family: Manrope, sans-serif'), 'HUD headings and controls must retain the public site heading font.');
assert(css.includes('grid-template-areas:\n    "content photo"\n    "content actions"'), 'Desktop hero must reserve a top-right photo area.');
assert(css.includes('grid-template-areas:\n      "photo"\n      "content"\n      "actions"'), 'Mobile hero must place the photo ahead of its content.');
assert(css.includes('aspect-ratio: 16 / 9'), 'Desktop protected photo must be landscape.');
assert(css.includes('aspect-ratio: 16 / 8'), 'Mobile protected photo must remain landscape.');
assert(css.includes('.private-photo-hero .private-photo-image { object-fit: cover; }'), 'Protected photo must crop rather than distort.');
assert(css.includes('.brand small, .eyebrow { font-size: 13px;'), 'HUD labels must not depend on tiny low-legibility text.');
assert(css.includes('.hud-runtime-status span, .hud-runtime-status time { color: #e3ebef; font-size: 15px;'), 'Connection status copy must be readable.');

console.log('HUD visual style: public palette, readable text, and responsive protected-photo placement verified.');
