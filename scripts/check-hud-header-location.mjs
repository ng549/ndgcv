import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js = fs.readFileSync('docs/hud/hud.js', 'utf8').replace(
  '\ninit();',
  '\nglobalThis.__hudHeaderLocationTest = { isFreshLocationPosition, readDeviceLocation, setManualLocation, startAutomaticLocation, state };'
);
const css = fs.readFileSync('docs/hud/hud.css', 'utf8');
const html = fs.readFileSync('docs/hud/index.html', 'utf8');

function element() {
  return {
    addEventListener() {},
    classList: { add() {}, remove() {} },
    dataset: {},
    disabled: false,
    hidden: false,
    setAttribute() {},
    style: { setProperty() {} },
    textContent: '',
  };
}

function createRuntime({ permission = 'granted', geolocation = true, promptValue = 'Manual place' } = {}) {
  const elements = new Map();
  const positionRequests = [];
  const getElement = selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const navigator = geolocation ? {
    geolocation: {
      getCurrentPosition(success, error, options) { positionRequests.push({ error, options, success }); },
    },
    permissions: {
      async query() {
        return { state: permission, addEventListener() {} };
      },
    },
  } : {};
  const context = {
    Array,
    Date,
    Map,
    Number,
    RegExp,
    Set,
    String,
    URL,
    console,
    document: { querySelector: getElement, querySelectorAll: () => [] },
    globalThis: {},
    navigator,
    setTimeout() { return 0; },
    clearTimeout() {},
    window: {
      location: { origin: 'https://nicolasgoureau.com' },
      prompt() { return promptValue; },
      setTimeout() { return 0; },
    },
  };
  vm.runInNewContext(js, context, { filename: 'docs/hud/hud.js' });
  return { elements, hud: context.globalThis.__hudHeaderLocationTest, positionRequests };
}

const freshPosition = () => ({ timestamp: Date.now() });

const granted = createRuntime({ permission: 'granted' });
await granted.hud.startAutomaticLocation();
assert.equal(granted.positionRequests.length, 1, 'Granted geolocation is read automatically at startup.');
assert.equal(granted.positionRequests[0].options.maximumAge, 15 * 60 * 1000, 'Automatic reads bound accepted location age.');
granted.positionRequests[0].success(freshPosition());
assert.equal(granted.elements.get('#hud-location').textContent, 'Device location available', 'A fresh granted read reports device availability without inventing a city.');

const prompt = createRuntime({ permission: 'prompt' });
await prompt.hud.startAutomaticLocation();
assert.equal(prompt.positionRequests.length, 1, 'The explicit automatic-location request lets the browser present its own prompt when needed.');
assert.equal(prompt.hud.readDeviceLocation(), false, 'Repeated clicks while a location read is underway do not queue another prompt or read.');

const denied = createRuntime({ permission: 'denied' });
await denied.hud.startAutomaticLocation();
assert.equal(denied.positionRequests.length, 0, 'Denied permission never retries geolocation at startup.');
assert.equal(denied.elements.get('#hud-location').textContent, 'Location permission is off', 'Denied permission has an honest manual-fallback status.');
assert.equal(denied.elements.get('#hud-use-location').disabled, true, 'Denied permission disables the repeated-prompt control.');

const unavailable = createRuntime({ geolocation: false });
await unavailable.hud.startAutomaticLocation();
assert.equal(unavailable.elements.get('#hud-location').textContent, 'Device location unavailable', 'Browsers without geolocation retain an honest manual fallback.');

const stale = createRuntime({ permission: 'granted', promptValue: 'Atlanta, GA' });
assert.equal(stale.hud.readDeviceLocation(), true, 'A manual refresh starts one current geolocation request.');
stale.hud.setManualLocation();
stale.positionRequests[0].success(freshPosition());
assert.equal(stale.elements.get('#hud-location').textContent, 'Atlanta, GA', 'A stale location callback cannot overwrite a newer manual choice.');
assert.equal(stale.hud.isFreshLocationPosition({ timestamp: Date.now() - (15 * 60 * 1000 + 1) }), false, 'Expired cached positions are rejected.');
assert.equal(stale.hud.isFreshLocationPosition(freshPosition()), true, 'Fresh positions are accepted.');

assert(html.includes('id="hud-location" aria-live="polite"'), 'Location updates are announced without claiming a city name.');
assert(!js.includes('.coords'), 'Coordinates are not stored or transmitted by the HUD location view.');
assert(css.includes('clamp(210px, 19vw, 300px)'), 'Desktop photo width is approximately half its prior 420–600px range.');
assert(css.includes('position: absolute;') && css.includes('grid-template-areas:\n      "content"\n      "actions";'), 'Desktop photo no longer participates in header alignment.');
assert(css.includes('width: min(calc(100% - 44px), 240px)'), 'Tablet/mobile photo size remains bounded and centered.');
assert(css.includes('aspect-ratio: 3 / 2') && css.includes('object-fit: contain') && css.includes('object-position: 50% 50%'), 'The 3:2 photo frame remains centered and uncropped.');
assert(css.includes('appearance: none;') && css.includes('padding: 9px 42px 9px 14px;') && css.includes('background-position: right 14px center;'), 'Native selects use one inset chevron with adequate text clearance.');
assert(css.includes('min-height: 44px') && css.includes('select:focus-visible') && css.includes('select:disabled'), 'Select controls retain accessible touch, focus, and disabled states.');

console.log('HUD header hotfix: compact independent photo, automatic permission-aware location, stale-read protection, and inset native select controls verified.');
