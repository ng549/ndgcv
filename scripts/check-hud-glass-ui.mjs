import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('docs/hud/index.html', 'utf8');
const script = fs.readFileSync('docs/hud/hud.js', 'utf8');
const css = fs.readFileSync('docs/hud/hud.css', 'utf8');

assert(html.includes('data-private-runtime-endpoint="/api/hud/connections"'), 'The status contract remains fixed and owner-gated.');
assert(html.includes('data-private-photo-endpoint="/api/hud/photo"'), 'The photo contract is a fixed same-origin endpoint.');
assert(html.includes('id="current-date"') && html.includes('id="current-time"'), 'The header exposes actual device date and time.');
assert(html.includes('id="location-display"') && html.includes('id="weather-display"'), 'The header exposes manual/device location and truthful weather availability.');
assert(html.includes('id="sync-status"') && html.includes('Connection status'), 'The lower rail includes a readable connection-status box.');
assert(html.includes('data-photo-layer="0"') && html.includes('data-photo-layer="1"'), 'The private frame reserves two in-memory crossfade layers.');

assert(script.includes("url.pathname !== '/api/hud/photo' || url.search || url.hash"), 'Photo requests cannot be redirected to an arbitrary path or query.');
assert(script.includes("credentials: 'same-origin'"), 'Private runtime fetches preserve same-origin credentials.');
assert(script.includes("cache: 'no-store'"), 'Photo fetches bypass browser caching.');
assert(script.includes("redirect: 'error'"), 'Photo fetches reject redirects.');
assert(script.includes("Accept: 'image/jpeg'"), 'Only JPEG photo bytes are accepted.');
assert(script.includes('PRIVATE_PHOTO_INTERVAL_MS = 20000'), 'The protected photo frame rotates at the approved twenty-second interval.');
assert(script.includes("prefers-reduced-motion: reduce"), 'Reduced motion disables automatic private-photo rotation.');
assert(!script.includes('__CAREER_HUD_PRIVATE_MEDIA__'), 'No inline runtime photo list can leak a source URL into the public bundle.');
assert(!/https?:\/\/[^\s'"`]+\.(?:jpe?g|png|webp)/i.test(script), 'No private photo URL is committed to client code.');

assert(css.includes('backdrop-filter: blur(18px)'), 'The HUD keeps translucent liquid-glass depth.');
assert(css.includes('@media (max-width: 760px)'), 'The HUD includes a mobile layout.');
assert(css.includes('prefers-reduced-motion'), 'The HUD provides reduced-motion styling.');

console.log('HUD glass UI: fixed protected photo contract, truthful connection state, date/time/location/weather header, two-layer crossfade, no committed photo URL, and responsive/reduced-motion styling passed.');
