const state = {
  activeView: 'career',
  liveOpportunities: false,
  liveDrafts: new Map(),
  liveSaves: new Map(),
  location: {
    permission: 'unknown',
    requestEpoch: 0,
    requestInFlight: false,
    startupStarted: false,
  },
  connections: {
    accessEpoch: 0,
    activeRequest: null,
    diagnostic: null,
    drafts: new Map(),
    phase: 'loading',
    requestEpoch: 0,
    revision: null,
    sources: null,
    tests: new Map(),
  },
  referenceConnection: 'sample',
  references: [],
  selectedDay: '',
  renderedWeekDate: '',
  schedule: 'today',
  focusFilter: 'all',
  expandedFocus: 'focus_followups',
  noteTab: 'actions',
  selectedOpportunity: 'opportunity_northline',
  focusItems: [
    { id: 'focus_followups', time: '09:00', title: 'Career follow-ups', detail: 'Move two conversations forward.', expanded: 'Review the next step for each sample conversation.', complete: false },
    { id: 'focus_research', time: '11:00', title: 'Opportunity research', detail: 'Find a role with room to build.', expanded: 'Compare the operating mandate and the customer promise.', complete: false },
    { id: 'focus_close', time: '16:00', title: 'Close the day', detail: 'Capture next steps for tomorrow.', expanded: 'Convert the day into a short, specific plan.', complete: false }
  ],
  note: {
    title: 'Career follow-ups',
    prompts: ['What can I help them build?', 'What responsibility would I own?'],
    actions: [
      { id: 'task_intro', label: 'Follow up on the introduction', complete: false },
      { id: 'task_examples', label: 'Prepare three relevant examples', complete: false }
    ]
  },
  opportunities: [
    {
      id: 'opportunity_northline', companyId: 'company_northline', company: 'Northline Retail Group', role: 'Operating partner', status: 'conversation',
      summary: 'A growth-stage retail platform seeking a practical operator for stores, product, and margin.',
      fit: 'The brief connects retail execution, assortment decisions, and the operating cadence needed to scale.',
      contact: 'Recruiter relationship · sample record',
      nextAction: { id: 'activity_northline_intro', label: 'Shape the first conversation around the operating mandate', complete: false },
      activity: ['Sample fit note added', 'Sample recruiter conversation logged']
    },
    {
      id: 'opportunity_harbor', companyId: 'company_harbor', company: 'Harbor & Field', role: 'VP, Commercial Operations', status: 'research',
      summary: 'A consumer business considering a multi-channel expansion and clearer operating ownership.',
      fit: 'Good signal if the role has authority across merchandising, store operations, and the customer journey.',
      contact: 'Target company · no contact connected',
      nextAction: { id: 'activity_harbor_research', label: 'Clarify the decision rights and operating scope', complete: false },
      activity: ['Sample company research saved']
    },
    {
      id: 'opportunity_studio', companyId: 'company_studio', company: 'Studio Commons', role: 'President, New Ventures', status: 'interview',
      summary: 'A portfolio team exploring a new consumer concept with retail and service components.',
      fit: 'A strong match when the mandate starts with the concept but extends through launch and daily operation.',
      contact: 'Hiring lead relationship · sample record',
      nextAction: { id: 'activity_studio_examples', label: 'Share three leadership examples tied to the mandate', complete: false },
      activity: ['Sample interview prep created', 'Sample leadership evidence selected']
    }
  ],
  contacts: [
    { id: 'contact_mira', name: 'Mira Chen', context: 'Recruiter relationship', detail: 'Sample contact · connected around operating leadership.', permission: 'Permission status: sample only' },
    { id: 'contact_daniel', name: 'Daniel Brooks', context: 'Reference relationship', detail: 'Sample contact · heads-up status intentionally unconnected.', permission: 'Heads-up: not connected' },
    { id: 'contact_avery', name: 'Avery Ortiz', context: 'Industry relationship', detail: 'Sample contact · useful perspective on consumer growth.', permission: 'Permission status: sample only' }
  ],
  documents: [
    { id: 'document_cv', title: 'Executive CV', detail: 'Approved source for the public website and downloadable CV.', version: 'v3 · approved sample', current: true },
    { id: 'document_northline_resume', title: 'Northline tailored résumé', detail: 'Sample employer-specific version tracked locally in preview.', version: 'v1 · sample draft', current: false },
    { id: 'document_evidence', title: 'Leadership evidence', detail: 'Sample examples selected for interview preparation.', version: 'v2 · sample set', current: false },
    { id: 'document_direction', title: 'Career direction brief', detail: 'Sample mandate and target-company criteria.', version: 'v1 · sample draft', current: false }
  ],
  mandate: 'Lead the work of turning promising consumer and retail opportunities into operations that customers, teams, and owners can rely on.',
  targets: [
    { id: 'company_northline', name: 'Northline Retail Group', reason: 'Operating platform' },
    { id: 'company_harbor', name: 'Harbor & Field', reason: 'Multi-channel growth' },
    { id: 'company_studio', name: 'Studio Commons', reason: 'New ventures' }
  ]
};

const sampleSourceState = {
  focusItems: JSON.parse(JSON.stringify(state.focusItems)),
  opportunities: JSON.parse(JSON.stringify(state.opportunities)),
  selectedOpportunity: state.selectedOpportunity,
  expandedFocus: state.expandedFocus,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
let toastTimer;
let clockTimer;
let photoTimer;
let activePhotoSlot = 'b';
let activePhotoObjectUrl = null;
let photoRequestInFlight = false;
let photoReloadQueued = false;
let opportunitySourceGeneration = 0;
let referenceSourceGeneration = 0;
let photoSourceGeneration = 0;

const PHOTO_ROTATION_MS = 20_000;
const LOCATION_MAX_AGE_MS = 15 * 60 * 1000;
const LIVE_STATUS_VALUES = ['research', 'research_lead', 'interested', 'conversation', 'applied', 'interview', 'offer', 'paused', 'closed', 'declined'];
const LIVE_REVISION_PATTERN = /^[a-f0-9]{64}$/;
const REFERENCE_ID_PATTERN = /^REF-[A-Za-z0-9_-]{1,128}$/;
const REFERENCE_PERMISSION_VALUES = new Set(['Agreed', 'Ask first', 'Unavailable']);
const REFERENCES_MAX_BYTES = 2 * 1024 * 1024;
const REFERENCES_MAX_RECORDS = 999;
const CONNECTION_SOURCE_DETAILS = Object.freeze({
  opportunities: { help: 'Paste the Google Sheet link that backs private opportunities.', label: 'Opportunities Sheet', type: 'Google Sheet link' },
  references: { help: 'Paste the Google Sheet link that backs private references.', label: 'References Sheet', type: 'Google Sheet link' },
  photos: { help: 'Paste the Google Drive folder link for private photos.', label: 'Private Photos folder', type: 'Google Drive folder link' },
});
const CONNECTION_SOURCE_NAMES = Object.keys(CONNECTION_SOURCE_DETAILS);
const CONNECTION_STATES = new Set(['default', 'active']);
const CONNECTION_STATUSES = new Set(['not_tested', 'ready', 'unavailable', 'invalid']);
const CONNECTION_ERROR_CODES = new Set(['hud_access_required', 'hud_backend_unavailable', 'hud_invalid_request', 'hud_not_connected', 'hud_source_unavailable', 'hud_unavailable']);
const HUD_VIEWS = new Set(['today', 'calendar', 'email', 'career', 'contacts', 'applications', 'interviews', 'materials', 'direction', 'readiness', 'paid-work', 'personal', 'scout', 'media-os', 'sourcing-os', 'appdev-os']);
const CONNECTION_URL_MAX_LENGTH = 4096;
const CONNECTION_DIAGNOSTIC_MAX_BYTES = 512;
const WORKER_TRANSPORT_FAILURE_TEXT = 'HUD opportunities are unavailable.';

function hudRuntimeEndpoint(dataKey, pathname) {
  const configured = document.documentElement.dataset[dataKey];
  if (configured !== pathname) return null;
  try {
    const endpoint = new URL(configured, window.location.origin);
    if (endpoint.origin === window.location.origin && endpoint.pathname === pathname && !endpoint.search && !endpoint.hash) return endpoint;
  } catch {
    return null;
  }
  return null;
}

function updateHeaderContext() {
  const now = new Date();
  const date = $('#hud-current-date');
  const time = $('#hud-current-time');
  if (date) {
    date.dateTime = now.toISOString().slice(0, 10);
    date.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
  }
  if (time) time.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
  renderWeekStrip(now);
}

function localDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function mondayFor(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function renderWeekStrip(now) {
  const todayKey = localDateKey(now);
  if (state.renderedWeekDate === todayKey) return;
  state.renderedWeekDate = todayKey;

  const monday = mondayFor(now);
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
  const currentWeekday = now.getDay();
  const selectedDate = currentWeekday >= 1 && currentWeekday <= 5 ? now : days[0];
  state.selectedDay = localDateKey(selectedDate);

  const weekLabel = $('#hud-week-label');
  const strip = $('#hud-week-strip');
  const dayGroup = $('#hud-week-days');
  const fullDate = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const monthYear = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

  weekLabel.textContent = monthYear.format(now);
  strip.setAttribute('aria-label', `Week of ${fullDate.format(monday)}`);
  dayGroup.innerHTML = days.map(date => {
    const key = localDateKey(date);
    const isToday = key === todayKey;
    const isSelected = key === state.selectedDay;
    return `<button class="${isSelected ? 'is-selected ' : ''}${isToday ? 'is-today' : ''}" type="button" data-day="${key}" aria-pressed="${isSelected}"><strong>${weekday.format(date)}</strong><span>${monthDay.format(date)}</span><em>Today</em></button>`;
  }).join('');
}

function setManualLocation() {
  const value = window.prompt('Enter a city or location for this private HUD.');
  const location = value?.trim();
  if (!location) return;
  state.location.requestEpoch += 1;
  state.location.requestInFlight = false;
  setLocationControlState({ disabled: ['denied', 'unavailable'].includes(state.location.permission) });
  $('#hud-location').textContent = location;
  announce('Manual location saved in this browser session. Weather remains unavailable.');
}

function setLocationControlState({ disabled = false } = {}) {
  const button = $('#hud-use-location');
  if (button) button.disabled = disabled;
}

function setLocationUnavailable(message) {
  state.location.requestEpoch += 1;
  state.location.requestInFlight = false;
  setLocationControlState({ disabled: true });
  const location = $('#hud-location');
  if (location) location.textContent = message;
}

function locationRequestIsCurrent(epoch) {
  return epoch === state.location.requestEpoch;
}

function isFreshLocationPosition(position) {
  const timestamp = Number(position?.timestamp);
  return Number.isFinite(timestamp) && timestamp <= Date.now() && Date.now() - timestamp <= LOCATION_MAX_AGE_MS;
}

function requestDeviceLocation() {
  return readDeviceLocation();
}

function readDeviceLocation({ announceResult = true } = {}) {
  if (!navigator.geolocation) {
    state.location.permission = 'unavailable';
    setLocationUnavailable('Device location unavailable');
    if (announceResult) announce('Device location is unavailable in this browser. Set a location manually instead.');
    return false;
  }

  if (state.location.permission === 'denied') {
    setLocationUnavailable('Location permission is off');
    if (announceResult) announce('Location permission is off. Set a location manually instead.');
    return false;
  }

  if (state.location.requestInFlight) return false;
  const epoch = state.location.requestEpoch + 1;
  state.location.requestEpoch = epoch;
  state.location.requestInFlight = true;
  setLocationControlState({ disabled: true });
  $('#hud-location').textContent = 'Checking device location';
  navigator.geolocation.getCurrentPosition(
    position => {
      if (!locationRequestIsCurrent(epoch)) return;
      state.location.requestInFlight = false;
      setLocationControlState();
      if (!isFreshLocationPosition(position)) {
        $('#hud-location').textContent = 'Device location needs refresh';
        if (announceResult) announce('The available device location is too old. Refresh it or set a location manually.');
        return;
      }
      // Coordinates are intentionally neither stored nor sent to a geocoder.
      $('#hud-location').textContent = 'Device location available';
      if (announceResult) announce('Device location is available for this browser session. Weather remains unavailable.');
    },
    error => {
      if (!locationRequestIsCurrent(epoch)) return;
      state.location.requestInFlight = false;
      setLocationControlState();
      if (error?.code === 1) {
        state.location.permission = 'denied';
        setLocationUnavailable('Location permission is off');
        if (announceResult) announce('Location permission was not granted. Set a location manually instead.');
        return;
      }
      $('#hud-location').textContent = error?.code === 3 ? 'Device location timed out' : 'Device location unavailable';
      if (announceResult) announce('Device location is unavailable right now. Set a location manually instead.');
    },
    { enableHighAccuracy: false, maximumAge: LOCATION_MAX_AGE_MS, timeout: 10_000 }
  );
  return true;
}

async function startAutomaticLocation() {
  if (state.location.startupStarted) return;
  state.location.startupStarted = true;
  if (!navigator.geolocation) {
    state.location.permission = 'unavailable';
    setLocationUnavailable('Device location unavailable');
    return;
  }

  const epoch = state.location.requestEpoch;
  let permission = 'prompt';
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      permission = status?.state || permission;
      status?.addEventListener?.('change', () => {
        state.location.permission = status.state;
        if (status.state === 'denied') setLocationUnavailable('Location permission is off');
        else {
          setLocationControlState({ disabled: false });
          if (status.state === 'granted' && $('#hud-location')?.textContent === 'Location permission is off') $('#hud-location').textContent = 'Location permission granted';
        }
      });
    }
  } catch {
    // A missing Permissions API is not a denial; the browser remains the permission authority.
  }
  if (epoch !== state.location.requestEpoch) return;
  state.location.permission = permission;
  if (permission === 'denied') {
    setLocationUnavailable('Location permission is off');
    return;
  }
  readDeviceLocation({ announceResult: false });
}

function formatActualSyncTime(value) {
  if (typeof value !== 'string' || !value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function renderRuntimeStatus({ state: syncState = 'unconnected', lastSuccessfulAt = null } = {}) {
  const allowedStates = new Set(['loading', 'fresh', 'stale', 'error']);
  const phase = allowedStates.has(syncState) ? syncState : 'unconnected';
  const copy = {
    loading: ['Checking private source', 'No result yet.'],
    fresh: ['Private opportunities loaded', 'Current for this visit.'],
    stale: ['Private source needs refresh', 'Last refresh is older than policy.'],
    error: ['Private source is unavailable', 'No new records loaded.'],
    unconnected: ['Not connected', 'Live records are unavailable.']
  }[phase];
  const status = $('#hud-runtime-status');
  const lastSuccess = formatActualSyncTime(lastSuccessfulAt);
  status.dataset.syncState = phase;
  $('#hud-runtime-title').textContent = copy[0];
  $('#hud-runtime-detail').textContent = copy[1];
  const time = $('#hud-runtime-last-success');
  time.hidden = !lastSuccess;
  if (lastSuccess) {
    time.dateTime = new Date(lastSuccessfulAt).toISOString();
    time.textContent = `Last successful sync: ${lastSuccess}`;
  }
}

function trustedCareerSheetUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'https:' && url.hostname === 'docs.google.com' && /^\/spreadsheets\/d\/[^/]+\/edit$/.test(url.pathname)) return url.href;
  } catch {
    return null;
  }
  return null;
}

function renderRuntimeLinks(links) {
  const group = $('#hud-runtime-links');
  const sheet = $('#hud-career-sheet-link');
  const href = trustedCareerSheetUrl(links?.careerSheetUrl);
  sheet.hidden = !href;
  if (href) sheet.href = href;
  else sheet.removeAttribute('href');
  group.hidden = !href;
}

function recordText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function referenceText(value, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new TypeError('Invalid references payload.');
  const text = value.trim();
  if (text.length > maxLength) throw new TypeError('Invalid references payload.');
  return text;
}

async function readBoundedReferencesJson(response) {
  const declaredLength = response.headers.get('Content-Length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > REFERENCES_MAX_BYTES) {
    try { await response.body?.cancel(); } catch { /* The response body may already have ended or failed. */ }
    throw new TypeError('Private references response is too large.');
  }
  if (!response.body) throw new TypeError('Private references response is empty.');

  const reader = response.body.getReader();
  const chunks = [];
  let byteLength = 0;
  let cancelled = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > REFERENCES_MAX_BYTES) {
        await reader.cancel();
        cancelled = true;
        throw new TypeError('Private references response is too large.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (!cancelled) {
      try { await reader.cancel(); } catch { /* The response stream already ended or failed. */ }
    }
    throw error;
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

function normalizeLiveReferences(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.references)) throw new TypeError('Invalid references payload.');
  if (payload.references.length > REFERENCES_MAX_RECORDS) throw new TypeError('Invalid references payload.');
  const seen = new Set();
  return payload.references.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Invalid references payload.');
    const referenceId = referenceText(item.referenceId, 132);
    const name = referenceText(item.name, 180);
    const permission = referenceText(item.permission, 32);
    if (!REFERENCE_ID_PATTERN.test(referenceId) || !name || !REFERENCE_PERMISSION_VALUES.has(permission) || seen.has(referenceId)) {
      throw new TypeError('Invalid references payload.');
    }
    seen.add(referenceId);
    return {
      referenceId,
      name,
      preferredName: referenceText(item.preferredName, 120),
      workEmail: referenceText(item.workEmail, 320),
      personalEmail: referenceText(item.personalEmail, 320),
      phone: referenceText(item.phone, 64),
      linkedinUrl: referenceText(item.linkedinUrl, 2_048),
      sharedCompanies: referenceText(item.sharedCompanies, 1_000),
      notes: referenceText(item.notes, 4_000),
      introductionDraft: referenceText(item.introductionDraft, 4_000),
      headsUpDraft: referenceText(item.headsUpDraft, 4_000),
      permission,
    };
  });
}

function trustedReferenceEmail(value) {
  const email = recordText(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return null;
  return `mailto:${encodeURIComponent(email)}`;
}

function trustedReferencePhone(value) {
  const phone = recordText(value);
  if (!/^[0-9+().\s-]{3,64}$/.test(phone)) return null;
  const destination = phone.replace(/[().\s-]/g, '');
  return /^\+?\d{3,}$/.test(destination) ? `tel:${destination}` : null;
}

function trustedLinkedInUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol === 'https:' && (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com'))) return url.href;
  } catch {
    // Invalid or non-HTTPS outbound links are intentionally hidden.
  }
  return null;
}

function statusClass(value) {
  const status = recordText(value).toLowerCase();
  return LIVE_STATUS_VALUES.includes(status) ? status : 'research';
}

function liveRevision(value) {
  const revision = recordText(value);
  return LIVE_REVISION_PATTERN.test(revision) ? revision : null;
}

function opportunityIndex(values) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) throw new TypeError('Invalid opportunities payload.');
  const index = new Map(values[0].map((value, position) => [recordText(value).toLowerCase(), position]));
  for (const field of ['opportunity_id', 'company', 'title', 'status', 'next_action']) {
    if (!index.has(field)) throw new TypeError('Invalid opportunities payload.');
  }
  return index;
}

function valueAt(row, index, field) {
  const position = index.get(field);
  return position === undefined ? '' : recordText(row[position]);
}

function normalizeLiveOpportunities(values, revisions = {}) {
  const index = opportunityIndex(values);
  const revisionMap = revisions && typeof revisions === 'object' && !Array.isArray(revisions) ? revisions : {};
  return values.slice(1).flatMap(rawRow => {
    const row = Array.isArray(rawRow) ? rawRow : [];
    const id = valueAt(row, index, 'opportunity_id');
    if (!/^opp_[A-Za-z0-9_-]{8,128}$/.test(id)) return [];
    const company = valueAt(row, index, 'company');
    const role = valueAt(row, index, 'title');
    const location = valueAt(row, index, 'location');
    const arrangement = valueAt(row, index, 'work_arrangement');
    const fit = valueAt(row, index, 'fit_rationale');
    const status = valueAt(row, index, 'status') || 'research';
    const nextAction = valueAt(row, index, 'next_action');
    return [{
      id,
      companyId: `live_${id}`,
      company: company || 'Company not supplied',
      role: role || 'Title not supplied',
      status,
      statusClass: statusClass(status),
      summary: [location, arrangement].filter(Boolean).join(' · ') || 'No location or work arrangement supplied.',
      fit: fit || 'No fit rationale supplied.',
      contact: 'Private opportunities source',
      revision: liveRevision(revisionMap[id]),
      nextAction: { id: `next_${id}`, label: nextAction || 'No next action supplied.', complete: false },
      activity: []
    }];
  });
}

function normalizeLiveToday(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const opportunityId = recordText(item?.opportunityId);
    const title = recordText(item?.title);
    if (!/^opp_[A-Za-z0-9_-]{8,128}$/.test(opportunityId) || !title) return [];
    return [{
      id: recordText(item.id) || `followup_${opportunityId}`,
      time: 'Next',
      title,
      detail: recordText(item.detail) || 'No company or role detail supplied.',
      expanded: 'This follow-up is supplied by the protected opportunities source.',
      complete: false
    }];
  });
}

function applyOpportunityPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new TypeError('Invalid opportunities payload.');
  const opportunities = normalizeLiveOpportunities(payload.values, payload.revisions);
  const previouslySelected = state.selectedOpportunity;
  state.opportunities = opportunities;
  state.selectedOpportunity = opportunities.some(opportunity => opportunity.id === previouslySelected) ? previouslySelected : opportunities[0]?.id ?? null;
  state.liveOpportunities = true;
  state.focusItems = normalizeLiveToday(payload.today);
  state.expandedFocus = state.focusItems[0]?.id ?? '';
  $('#hud-data-mode').textContent = 'Private source connected';
  $('#career-intro').textContent = 'Private source connected';
  renderRuntimeStatus({ state: 'fresh' });
  renderRuntimeLinks(payload.links);
  renderToday();
  renderOpportunities();
}

function resetOpportunitiesForSourceChange() {
  opportunitySourceGeneration += 1;
  state.liveOpportunities = false;
  state.liveDrafts.clear();
  state.liveSaves.clear();
  state.focusItems = JSON.parse(JSON.stringify(sampleSourceState.focusItems));
  state.opportunities = JSON.parse(JSON.stringify(sampleSourceState.opportunities));
  state.selectedOpportunity = sampleSourceState.selectedOpportunity;
  state.expandedFocus = sampleSourceState.expandedFocus;
  $('#hud-data-mode').textContent = 'Sample data';
  $('#career-intro').textContent = 'Sample data';
  renderRuntimeStatus();
  renderRuntimeLinks();
  renderToday();
  renderOpportunities();
}

function resetReferencesForSourceChange() {
  referenceSourceGeneration += 1;
  state.references = [];
  state.referenceConnection = 'sample';
  renderContacts();
}

function resetPrivatePhotoForSourceChange({ queueReload = true } = {}) {
  photoSourceGeneration += 1;
  if (photoRequestInFlight && queueReload) photoReloadQueued = true;
  if (!queueReload) photoReloadQueued = false;
  if (activePhotoObjectUrl) URL.revokeObjectURL(activePhotoObjectUrl);
  activePhotoObjectUrl = null;
  activePhotoSlot = 'b';
  $$('.private-photo-image').forEach(image => {
    image.classList.remove('is-visible');
    image.removeAttribute('src');
  });
  renderPrivatePhotoState('Checking private source');
}

function resetSourceForConnectionChange(source, { queuePhotoReload = true } = {}) {
  if (source === 'opportunities') {
    resetOpportunitiesForSourceChange();
    return;
  }
  if (source === 'references') {
    resetReferencesForSourceChange();
    return;
  }
  if (source === 'photos') {
    resetPrivatePhotoForSourceChange({ queueReload: queuePhotoReload });
  }
}

async function loadOpportunities() {
  const endpoint = hudRuntimeEndpoint('hudOpportunitiesEndpoint', '/api/hud/opportunities');
  if (!endpoint) return;
  const sourceGeneration = opportunitySourceGeneration;
  renderRuntimeStatus({ state: 'loading' });
  try {
    const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, redirect: 'error' });
    if (sourceGeneration !== opportunitySourceGeneration) return false;
    if (response.status === 204 || response.status === 404 || response.status === 409) {
      renderRuntimeStatus();
      renderRuntimeLinks();
      return;
    }
    if (!response.ok) throw new Error(`Private runtime request failed (${response.status}).`);
    const payload = await response.json();
    if (sourceGeneration !== opportunitySourceGeneration) return false;
    applyOpportunityPayload(payload);
    return true;
  } catch {
    if (sourceGeneration !== opportunitySourceGeneration) return false;
    renderRuntimeStatus({ state: 'error' });
    renderRuntimeLinks();
  }
  return false;
}

async function loadReferences() {
  const endpoint = hudRuntimeEndpoint('hudReferencesEndpoint', '/api/hud/references');
  if (!endpoint) return false;
  const sourceGeneration = referenceSourceGeneration;
  state.referenceConnection = 'loading';
  renderContacts();
  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      redirect: 'error'
    });
    if (sourceGeneration !== referenceSourceGeneration) return false;
    if (response.status === 204 || response.status === 404 || response.status === 409) {
      state.referenceConnection = 'unconnected';
      renderContacts();
      return false;
    }
    if (response.status === 403) {
      state.referenceConnection = 'access';
      renderContacts();
      return false;
    }
    if (!response.ok) throw new Error(`Private references request failed (${response.status}).`);
    const references = normalizeLiveReferences(await readBoundedReferencesJson(response));
    if (sourceGeneration !== referenceSourceGeneration) return false;
    state.references = references;
    state.referenceConnection = 'connected';
    renderContacts();
    return true;
  } catch {
    if (sourceGeneration !== referenceSourceGeneration) return false;
    state.referenceConnection = 'error';
    renderContacts();
  }
  return false;
}

function renderPrivatePhotoState(message) {
  const stateLabel = $('#hud-private-photo-state');
  if (stateLabel) stateLabel.textContent = message;
}

function photoContentType(response) {
  return response.headers.get('content-type')?.toLowerCase().split(';', 1)[0] ?? '';
}

async function loadPrivatePhoto() {
  const endpoint = hudRuntimeEndpoint('hudPhotoEndpoint', '/api/hud/photo');
  const frame = $('#hud-private-photo-frame');
  if (!endpoint || !frame) return;
  if (photoRequestInFlight) {
    photoReloadQueued = true;
    return;
  }

  photoRequestInFlight = true;
  const sourceGeneration = photoSourceGeneration;
  renderPrivatePhotoState('Checking private source');
  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { Accept: 'image/jpeg' }
    });
    if (sourceGeneration !== photoSourceGeneration) return;
    if (response.status === 403) {
      renderPrivatePhotoState('Private access required');
      return;
    }
    if (response.status === 204 || response.status === 404 || response.status === 409) {
      renderPrivatePhotoState('Not connected');
      return;
    }
    if (!response.ok || photoContentType(response) !== 'image/jpeg') throw new Error('Private photo request failed.');

    const blob = await response.blob();
    if (!blob.size || blob.type !== 'image/jpeg') throw new Error('Private photo response was not a JPEG.');
    if (sourceGeneration !== photoSourceGeneration) return;

    const nextSlot = activePhotoSlot === 'a' ? 'b' : 'a';
    const incoming = $(`#hud-private-photo-${nextSlot}`);
    const outgoing = $(`#hud-private-photo-${activePhotoSlot}`);
    const nextObjectUrl = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      incoming.onload = resolve;
      incoming.onerror = () => reject(new Error('Private photo could not be rendered.'));
      incoming.src = nextObjectUrl;
    });
    if (sourceGeneration !== photoSourceGeneration) {
      if (incoming.src === nextObjectUrl) incoming.removeAttribute('src');
      URL.revokeObjectURL(nextObjectUrl);
      return;
    }

    incoming.classList.add('is-visible');
    outgoing.classList.remove('is-visible');
    const priorObjectUrl = activePhotoObjectUrl;
    activePhotoObjectUrl = nextObjectUrl;
    activePhotoSlot = nextSlot;
    window.setTimeout(() => {
      if (priorObjectUrl) URL.revokeObjectURL(priorObjectUrl);
      if (outgoing.src.startsWith('blob:')) outgoing.removeAttribute('src');
    }, 850);
    renderPrivatePhotoState('Private photo loaded');
  } catch {
    if (sourceGeneration === photoSourceGeneration) renderPrivatePhotoState('Private source unavailable');
  } finally {
    photoRequestInFlight = false;
    if (photoReloadQueued) {
      photoReloadQueued = false;
      void loadPrivatePhoto();
    }
  }
}

function announce(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
}

function runOnce(button, work) {
  if (button?.dataset.busy === 'true') return;
  if (button) {
    button.dataset.busy = 'true';
    button.disabled = true;
  }
  try {
    work();
  } finally {
    window.setTimeout(() => {
      if (button) {
        button.disabled = false;
        delete button.dataset.busy;
      }
    }, 350);
  }
}

function setHudMenu(open) {
  const menu = $('#hud-mobile-menu');
  const toggle = $('#hud-menu-toggle');
  if (!menu || !toggle) return;
  menu.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
}

function historyView() {
  const view = window.location?.hash?.replace(/^#/, '');
  return HUD_VIEWS.has(view) ? view : null;
}

function updateViewHistory(view, mode) {
  if (mode === 'none' || !window.history) return;
  const url = new URL(window.location.href);
  url.hash = view;
  if (mode === 'replace') window.history.replaceState({ hudView: view }, '', url);
  else if (window.location.hash !== `#${view}`) window.history.pushState({ hudView: view }, '', url);
}

function showView(view, { historyMode = 'push', focus = true } = {}) {
  if (!HUD_VIEWS.has(view)) return;
  setHudMenu(false);
  state.activeView = view;
  $$('[data-view-panel]').forEach(panel => {
    const active = panel.dataset.viewPanel === view;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
  $$('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'career') renderOpportunities();
  if (view === 'contacts') renderContacts();
  if (view === 'materials') renderMaterials();
  if (view === 'direction') renderDirection();
  if (view === 'readiness') renderReadiness();
  if (view === 'today') renderToday();
  updateViewHistory(view, historyMode);
  if (focus) $('#hud-main').focus({ preventScroll: true });
}

function renderToday() {
  const focusList = $('#focus-list');
  const visibleItems = state.focusItems.filter(item => state.focusFilter === 'all' || (state.focusFilter === 'complete' ? item.complete : !item.complete));
  focusList.innerHTML = visibleItems.length ? visibleItems.map(item => {
    const expanded = item.id === state.expandedFocus;
    return `<li class="focus-item ${expanded ? 'is-active' : ''} ${item.complete ? 'is-complete' : ''}">
      <button class="focus-toggle" type="button" data-focus-id="${item.id}" aria-expanded="${expanded}">
        <span class="focus-time">${item.time}</span>
        <span><strong>${escapeHTML(item.title)}</strong><span>${item.complete ? 'Completed in this sample session.' : escapeHTML(item.detail)}</span></span>
      </button>
      ${expanded ? `<div class="focus-expanded"><p>${escapeHTML(item.expanded)}</p>${state.liveOpportunities ? '<p class="note-prompt">Connected follow-ups are view-only here. Update status or next action in Career.</p>' : `<button class="complete-link" type="button" data-complete-focus="${item.id}">${item.complete ? 'Reopen this sample focus block' : 'Complete this focus block'}</button>`}</div>` : ''}
    </li>`;
  }).join('') : `<li class="empty-state">${state.liveOpportunities ? 'No live follow-ups are currently available from the protected source.' : 'No sample focus blocks match this filter.'}</li>`;

  const addFocus = $('.add-focus');
  addFocus.disabled = state.liveOpportunities;
  addFocus.textContent = state.liveOpportunities ? 'Update live opportunities in Career' : 'Add a focus block';

  const noteActions = $('#note-actions');
  noteActions.innerHTML = `<ul class="check-list">${state.note.actions.map(action => `<li><input id="${action.id}" type="checkbox" data-note-action="${action.id}" ${action.complete ? 'checked' : ''}><label for="${action.id}">${escapeHTML(action.label)}</label></li>`).join('')}</ul>`;
  $('#note-notes').innerHTML = `<p class="note-prompt">${escapeHTML(state.note.prompts[0])}</p><p class="note-prompt">${escapeHTML(state.note.prompts[1])}</p>`;
  $('#note-heading').textContent = state.note.title;
  updateNoteTabs();
}

function updateNoteTabs() {
  $$('[data-note-tab]').forEach(button => {
    const selected = button.dataset.noteTab === state.noteTab;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  $$('[data-note-panel]').forEach(panel => { panel.hidden = panel.dataset.notePanel !== state.noteTab; });
}

function liveDraftFor(opportunity) {
  const draft = state.liveDrafts.get(opportunity.id);
  return {
    nextAction: recordText(draft && Object.hasOwn(draft, 'nextAction') ? draft.nextAction : opportunity.nextAction.label),
    status: recordText(draft && Object.hasOwn(draft, 'status') ? draft.status : opportunity.status),
  };
}

function liveSaveFor(opportunityId) {
  return state.liveSaves.get(opportunityId) || { phase: 'idle', message: 'Changes are saved only when you use Save changes.' };
}

function liveStatusOptions(status) {
  const current = recordText(status);
  const normalized = current.toLowerCase();
  const legacy = current && !LIVE_STATUS_VALUES.includes(normalized) ? `<option value="${escapeHTML(current)}" selected>${escapeHTML(current)} (existing status)</option>` : '';
  return legacy + LIVE_STATUS_VALUES.map(value => `<option value="${value}" ${value === current ? 'selected' : ''}>${escapeHTML(value.replaceAll('_', ' '))}</option>`).join('');
}

function liveSaveMessage(save) {
  const messages = {
    idle: 'Changes are saved only when you use Save changes.',
    saving: 'Saving to the protected source…',
    saved: 'Saved to the protected source.',
    conflict: 'The source changed. Latest data is loaded; review your preserved draft before saving again.',
    uncertain: 'Save outcome is unknown. Latest data is loaded; review it before trying again.',
    unavailable: 'The private source is unavailable. Your draft is preserved; no save was confirmed.',
    unconnected: 'The private source is not connected. Your draft is preserved locally.',
    access: 'Private access is required before a change can be saved.',
    invalid: 'The source rejected this update. Check the two fields and try again.',
    error: 'This change could not be saved. Your draft is preserved locally.',
  };
  return save.message || messages[save.phase] || messages.error;
}

function createLiveActionId() {
  if (!globalThis.crypto?.getRandomValues) return null;
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return `action_${[...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function sameLiveCommand(left, right) {
  return Boolean(left && right && left.actionId === right.actionId && left.status === right.status && left.nextAction === right.nextAction && left.expectedRevision === right.expectedRevision);
}

function liveCommandFor(opportunity, draft) {
  const status = recordText(draft.status);
  const nextAction = recordText(draft.nextAction);
  const revision = liveRevision(opportunity.revision);
  const existing = state.liveSaves.get(opportunity.id)?.command;
  const candidate = { expectedRevision: revision, nextAction, status };
  if (!status || status.length > 64 || !nextAction || nextAction.length > 500 || !revision) return null;
  if (!LIVE_STATUS_VALUES.includes(status) && status !== recordText(opportunity.status)) return null;
  if (sameLiveCommand(existing, { ...candidate, actionId: existing?.actionId })) return existing;
  const actionId = createLiveActionId();
  return actionId ? { ...candidate, actionId } : null;
}

async function responseJSON(response) {
  try { return await response.json(); } catch { return null; }
}

function connectionText(value, maxLength = CONNECTION_URL_MAX_LENGTH) {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

function connectionRevision(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function validConnectionSource(source) {
  return CONNECTION_SOURCE_NAMES.includes(source);
}

function normalizeConnectionSettings(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Invalid private connection settings.');
  const revision = connectionRevision(payload.revision);
  if (revision === null || !payload.sources || typeof payload.sources !== 'object' || Array.isArray(payload.sources)) throw new TypeError('Invalid private connection settings.');
  const sources = {};
  for (const source of CONNECTION_SOURCE_NAMES) {
    const item = payload.sources[source];
    const url = connectionText(item?.url);
    if (!item || typeof item !== 'object' || Array.isArray(item) || url === null || !CONNECTION_STATES.has(item.state) || !CONNECTION_STATUSES.has(item.status)) throw new TypeError('Invalid private connection settings.');
    sources[source] = { state: item.state, status: item.status, url };
  }
  return { revision, sources };
}

function normalizeConnectionTest(payload, source) {
  const checkedAt = connectionText(payload?.checkedAt, 128);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.source !== source || payload.status !== 'ready' || !checkedAt || Number.isNaN(Date.parse(checkedAt))) throw new TypeError('Invalid private connection test.');
  return { checkedAt, source, status: 'ready' };
}

function connectionEndpoint(source = '', suffix = '') {
  const endpoint = hudRuntimeEndpoint('hudConnectionsEndpoint', '/api/hud/connections');
  if (!endpoint || (source && !validConnectionSource(source))) return null;
  return new URL(`/api/hud/connections${source ? `/${source}` : ''}${suffix}`, window.location.origin);
}

function connectionDraft(source) {
  if (!validConnectionSource(source)) return '';
  if (state.connections.drafts.has(source)) return state.connections.drafts.get(source);
  return state.connections.sources?.[source]?.url || '';
}

function connectionTest(source) {
  const existing = state.connections.tests.get(source);
  if (existing) return existing;
  const status = state.connections.sources?.[source]?.status;
  return { phase: status === 'ready' ? 'saved' : status || 'idle' };
}

function connectionTestMessage(test) {
  const messages = {
    idle: 'Test the pasted link before connecting it.',
    not_tested: 'This source has not been tested yet.',
    testing: 'Testing this private source…',
    ready: 'Private test passed. The new link has not been saved.',
    saved: 'The source was connected after private validation. Change the link to test a replacement.',
    'test-unavailable': 'This source could not be reached. Test the link again before connecting it.',
    'test-invalid': 'This link is not valid for this source. Correct it and test again before connecting it.',
    'test-error': 'This source could not be tested. Correct it or try again before connecting it.',
    unconnected: 'Private setup support is not available.',
    conflict: 'Settings changed elsewhere. Latest private settings were refreshed; test this draft again.',
    saving: 'Saving this tested source…',
    reconciling: 'Save outcome is unknown. Checking the latest private settings before another attempt.',
    uncertain: 'Save outcome was not confirmed. Latest private settings were refreshed; compare the setting with your preserved draft before trying again.',
    unavailable: 'Save outcome is unknown and private settings could not be rechecked. Your draft is preserved in this session.',
    invalid: 'This update was rejected, but its outcome is being reconciled before another attempt.',
    error: 'Save outcome is unknown. Your draft is preserved in this session.',
  };
  return messages[test?.phase] || messages.error;
}

function renderConnections() {
  const summary = $('#connections-summary');
  const list = $('#connections-list');
  if (!summary || !list) return;
  const phase = state.connections.phase;
  const unavailable = {
    loading: 'Checking private connection settings. No source link is shown until the owner-only settings response is valid.',
    access: 'Private access is required before connection settings can be shown or changed.',
    unknown: 'A source save may have completed, but private settings could not be rechecked. Connection controls remain hidden until a valid owner-only settings response is available.',
    unconnected: 'Private setup support is not available. No source link was read or changed.',
    unavailable: 'Private connection settings are unavailable. No source link was read or changed.',
    invalid: 'Private connection settings could not be read safely. No source link was shown or changed.',
  };
  if (phase !== 'ready') {
    const diagnostic = connectionDiagnosticMessage(state.connections.diagnostic);
    summary.textContent = `${unavailable[phase] || unavailable.unavailable}${diagnostic ? ` ${diagnostic}` : ''}`;
    list.innerHTML = '<p class="connection-unavailable">Connection controls appear only after the protected settings source returns a valid owner response.</p>';
    return;
  }

  summary.textContent = 'Private source settings are loaded for this owner session. Test a pasted link before connecting it; drafts stay only in memory until saved.';
  const operationBusy = connectionOperationBusy();
  list.innerHTML = `<div class="connections-grid">${CONNECTION_SOURCE_NAMES.map(source => {
    const details = CONNECTION_SOURCE_DETAILS[source];
    const setting = state.connections.sources[source];
    const draft = connectionDraft(source);
    const test = connectionTest(source);
    const changed = draft !== setting.url;
    const canTest = Boolean(draft.trim()) && !operationBusy;
    const canSave = changed && test.phase === 'ready' && !operationBusy;
    return `<article class="connection-source" data-connection-source-card="${source}">
      <p class="eyebrow">${escapeHTML(details.type)}</p>
      <h4>${escapeHTML(details.label)}</h4>
      <p>${escapeHTML(details.help)}</p>
      <p class="connection-current">${setting.state === 'active' ? 'A private custom source is currently saved.' : 'The private default source is currently selected.'}</p>
      <label for="connection-${source}">${escapeHTML(details.type)}
        <input id="connection-${source}" data-connection-source="${source}" type="url" inputmode="url" autocomplete="off" spellcheck="false" maxlength="${CONNECTION_URL_MAX_LENGTH}" value="${escapeHTML(draft)}" ${operationBusy ? 'disabled' : ''}>
      </label>
      <p class="connection-test-status is-${escapeHTML(test.phase)}" id="connection-test-${source}" role="status" aria-live="polite">${escapeHTML(connectionTestMessage(test))}</p>
      <div class="connection-actions">
        <button class="button button-quiet" type="button" data-test-connection="${source}" ${canTest ? '' : 'disabled'}>${test.phase === 'testing' ? 'Testing…' : 'Test source'}</button>
        <button class="button button-navy" type="button" data-save-connection="${source}" ${canSave ? '' : 'disabled'}>${test.phase === 'saving' ? 'Connecting…' : 'Connect source'}</button>
      </div>
    </article>`;
  }).join('')}</div>`;
}

function safeConnectionContentType(response) {
  const type = response.headers?.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (type === 'application/json') return 'JSON';
  if (!type) return 'no content type';
  return 'an unsupported content type';
}

async function boundedConnectionDiagnosticText(response) {
  const declaredLength = response.headers?.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > CONNECTION_DIAGNOSTIC_MAX_BYTES) {
    try { await response.body?.cancel?.(); } catch {}
    return null;
  }
  const reader = response.body?.getReader?.();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value?.byteLength || 0;
      if (size > CONNECTION_DIAGNOSTIC_MAX_BYTES) {
        try { await reader.cancel(); } catch {}
        return null;
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(body);
  } catch {
    return null;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

async function connectionDiagnosticFromResponse(response) {
  let errorCode = null;
  const contentType = safeConnectionContentType(response);
  let transport = null;
  if (contentType === 'JSON') {
    const body = await responseJSON(response);
    if (CONNECTION_ERROR_CODES.has(body?.error)) errorCode = body.error;
  } else {
    const text = await boundedConnectionDiagnosticText(response);
    transport = text === WORKER_TRANSPORT_FAILURE_TEXT ? 'worker_transport_failure' : 'upstream_non_json';
  }
  return { contentType, errorCode, kind: 'http', status: response.status, transport };
}

function connectionDiagnosticMessage(diagnostic) {
  if (!diagnostic) return '';
  if (diagnostic.kind === 'network') return 'The request did not complete (network or redirect blocked).';
  if (diagnostic.kind === 'invalid') return 'The protected response could not be read safely.';
  if (diagnostic.kind !== 'http' || !Number.isSafeInteger(diagnostic.status)) return '';
  const error = diagnostic.errorCode ? ` · ${diagnostic.errorCode}` : '';
  const transport = diagnostic.transport === 'worker_transport_failure' || diagnostic.transport === 'upstream_non_json' ? ` · ${diagnostic.transport}` : '';
  return `Diagnostic: HTTP ${diagnostic.status} · ${diagnostic.contentType}${error}${transport}.`;
}

function setConnectionPhase(phase, diagnostic = null) {
  state.connections.phase = phase;
  state.connections.diagnostic = diagnostic;
  renderConnections();
}

function beginConnectionRequest() {
  if (connectionOperationBusy()) return null;
  const token = {
    accessEpoch: state.connections.accessEpoch,
    requestEpoch: state.connections.requestEpoch + 1,
  };
  state.connections.requestEpoch = token.requestEpoch;
  state.connections.activeRequest = token;
  return token;
}

function connectionOperationBusy() {
  return state.connections.activeRequest !== null;
}

function connectionRequestIsCurrent(token) {
  return Boolean(token
    && token.accessEpoch === state.connections.accessEpoch
    && token.requestEpoch === state.connections.requestEpoch
    && state.connections.activeRequest === token);
}

function connectionAccessIsCurrent(accessEpoch) {
  return accessEpoch === state.connections.accessEpoch;
}

function finishConnectionRequest(token) {
  if (state.connections.activeRequest !== token) return false;
  state.connections.activeRequest = null;
  return true;
}

function concealConnectionAccessIfCurrent(token) {
  if (!token || !connectionAccessIsCurrent(token.accessEpoch)) return false;
  concealPrivateConnections();
  return true;
}

function concealPrivateConnections() {
  state.connections.accessEpoch += 1;
  state.connections.requestEpoch += 1;
  state.connections.phase = 'access';
  state.connections.revision = null;
  state.connections.sources = null;
  state.connections.activeRequest = null;
  state.connections.diagnostic = null;
  state.connections.drafts.clear();
  state.connections.tests.clear();
  CONNECTION_SOURCE_NAMES.forEach(source => resetSourceForConnectionChange(source, { queuePhotoReload: false }));
  renderConnections();
}

function unknownConnectionSaveOutcome() {
  state.connections.phase = 'unknown';
  state.connections.diagnostic = null;
  state.connections.revision = null;
  state.connections.sources = null;
  renderConnections();
}

function applyConnectionSettings(payload, { preserveDrafts = true } = {}) {
  const settings = normalizeConnectionSettings(payload);
  state.connections.phase = 'ready';
  state.connections.revision = settings.revision;
  state.connections.sources = settings.sources;
  state.connections.diagnostic = null;
  if (!preserveDrafts) state.connections.drafts.clear();
  return settings;
}

function connectionSourceChanged(previous, next, source) {
  return Boolean(previous
    && (previous[source]?.url !== next[source].url || previous[source]?.state !== next[source].state));
}

async function transitionConnectionSnapshot(payload, { preserveDrafts = true, token = null } = {}) {
  if (token && !connectionRequestIsCurrent(token)) return null;
  const previousRevision = state.connections.revision;
  const previous = state.connections.sources
    ? Object.fromEntries(CONNECTION_SOURCE_NAMES.map(source => [source, { ...state.connections.sources[source] }]))
    : null;
  const settings = applyConnectionSettings(payload, { preserveDrafts });
  const changedSources = CONNECTION_SOURCE_NAMES.filter(source => connectionSourceChanged(previous, settings.sources, source));
  const opportunityRevisionAdvanced = previousRevision !== null && settings.revision > previousRevision;
  const sourcesToReload = new Set(changedSources);
  // The backend assigns opportunity row revisions from the global connection
  // revision. A references/photos update can therefore invalidate a pending
  // opportunity save even when its visible source URL has not changed.
  if (opportunityRevisionAdvanced) sourcesToReload.add('opportunities');
  if (sourcesToReload.size) {
    sourcesToReload.forEach(source => resetSourceForConnectionChange(source));
    await Promise.all([...sourcesToReload].map(source => {
      if (source === 'opportunities') return loadOpportunities();
      if (source === 'references') return loadReferences();
      return loadPrivatePhoto();
    }));
  }
  return token && !connectionRequestIsCurrent(token) ? null : settings;
}

async function loadConnections({ preserveDrafts = true } = {}) {
  const token = beginConnectionRequest();
  if (!token) return false;
  const endpoint = connectionEndpoint();
  if (!endpoint) {
    if (!connectionRequestIsCurrent(token)) return false;
    finishConnectionRequest(token);
    setConnectionPhase('unconnected');
    return false;
  }
  setConnectionPhase('loading');
  let receivedResponse = false;
  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      redirect: 'error',
    });
    receivedResponse = true;
    if (response.status === 403 && concealConnectionAccessIfCurrent(token)) return false;
    if (!connectionRequestIsCurrent(token)) return false;
    if (response.status === 404 || response.status === 409) { setConnectionPhase('unconnected', await connectionDiagnosticFromResponse(response)); return false; }
    if (!response.ok) { setConnectionPhase('unavailable', await connectionDiagnosticFromResponse(response)); return false; }
    const settings = await transitionConnectionSnapshot(await responseJSON(response), { preserveDrafts, token });
    if (!settings) return false;
    renderConnections();
    return true;
  } catch {
    if (!connectionRequestIsCurrent(token)) return false;
    setConnectionPhase('unavailable', receivedResponse ? { kind: 'invalid' } : { kind: 'network' });
    return false;
  } finally {
    if (finishConnectionRequest(token)) renderConnections();
  }
}

async function testConnection(source) {
  const endpoint = connectionEndpoint(source, '/test');
  const url = connectionDraft(source).trim();
  if (!endpoint || !url) return;
  const token = beginConnectionRequest();
  if (!token) return;
  state.connections.tests.set(source, { phase: 'testing' });
  renderConnections();
  let response;
  let body;
  try {
    response = await fetch(endpoint, {
      body: JSON.stringify({ url }),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'POST',
      redirect: 'error',
    });
    body = await responseJSON(response);
    if (response.status === 403 && concealConnectionAccessIfCurrent(token)) return;
    if (!connectionRequestIsCurrent(token)) return;
    if (response.ok) {
      try {
        const result = normalizeConnectionTest(body, source);
        state.connections.tests.set(source, { phase: result.status });
      } catch {
        state.connections.tests.set(source, { phase: 'error' });
      }
    } else {
      const phase = response.status === 404 || response.status === 409 ? 'unconnected'
        : response.status === 400 ? 'test-invalid'
          : response.status === 502 || response.status === 503 ? 'test-unavailable' : 'test-error';
      state.connections.tests.set(source, { phase });
    }
    renderConnections();
  } catch {
    if (!connectionRequestIsCurrent(token)) return;
    state.connections.tests.set(source, { phase: 'test-unavailable' });
    renderConnections();
  } finally {
    if (finishConnectionRequest(token)) renderConnections();
  }
}

async function reconcileConnectionAfterSaveIssue(source) {
  const accessEpoch = state.connections.accessEpoch;
  if (!connectionAccessIsCurrent(accessEpoch)) return false;
  state.connections.tests.set(source, { phase: 'reconciling' });
  renderConnections();
  const refreshed = await loadConnections({ preserveDrafts: true });
  if (!connectionAccessIsCurrent(accessEpoch)) return false;
  if (state.connections.phase !== 'ready' || !refreshed) {
    unknownConnectionSaveOutcome();
    return false;
  }
  state.connections.tests.set(source, {
    phase: 'uncertain',
  });
  renderConnections();
  return refreshed;
}

async function saveConnection(source) {
  const endpoint = connectionEndpoint(source);
  const url = connectionDraft(source).trim();
  if (!endpoint || !url || state.connections.revision === null || connectionTest(source).phase !== 'ready') return;
  const token = beginConnectionRequest();
  if (!token) return;
  state.connections.tests.set(source, { phase: 'saving' });
  renderConnections();
  let response;
  let body;
  try {
    response = await fetch(endpoint, {
      body: JSON.stringify({ expectedRevision: state.connections.revision, url }),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'PUT',
      redirect: 'error',
    });
    body = await responseJSON(response);
    if (response.status === 403 && concealConnectionAccessIfCurrent(token)) return;
    if (!connectionRequestIsCurrent(token)) return;
    if (response.ok) {
      try {
        const settings = await transitionConnectionSnapshot(body, { preserveDrafts: true, token });
        if (!settings) return;
        state.connections.drafts.delete(source);
        state.connections.tests.set(source, { phase: 'saved' });
        renderConnections();
        announce(`${CONNECTION_SOURCE_DETAILS[source].label} was connected to the protected source.`);
      } catch {
        if (!connectionRequestIsCurrent(token)) return;
        finishConnectionRequest(token);
        await reconcileConnectionAfterSaveIssue(source);
      }
      return;
    }
    if (response.status === 409 && body?.error === 'hud_not_connected') {
      state.connections.tests.set(source, { phase: 'unconnected' });
      renderConnections();
      return;
    }
    if (response.status === 409) {
      if (!finishConnectionRequest(token)) return;
      const refreshed = await loadConnections({ preserveDrafts: true });
      if (connectionAccessIsCurrent(token.accessEpoch) && state.connections.phase === 'ready') {
        state.connections.tests.set(source, { phase: refreshed ? 'conflict' : 'unavailable' });
        renderConnections();
      }
      return;
    }
    if (!finishConnectionRequest(token)) return;
    await reconcileConnectionAfterSaveIssue(source);
  } catch {
    if (!connectionRequestIsCurrent(token)) return;
    finishConnectionRequest(token);
    await reconcileConnectionAfterSaveIssue(source);
  } finally {
    if (finishConnectionRequest(token)) renderConnections();
  }
}

function captureConnectionDraft(event) {
  const input = event.target.closest?.('[data-connection-source]');
  const source = input?.dataset.connectionSource;
  if (!input || !validConnectionSource(source) || connectionOperationBusy()) return;
  state.connections.drafts.set(source, input.value.slice(0, CONNECTION_URL_MAX_LENGTH));
  state.connections.tests.set(source, { phase: 'idle' });
  const status = $(`#connection-test-${source}`);
  const save = $(`[data-save-connection="${source}"]`);
  const test = $(`[data-test-connection="${source}"]`);
  if (status) {
    status.className = 'connection-test-status is-idle';
    status.textContent = connectionTestMessage({ phase: 'idle' });
  }
  if (test) test.disabled = !input.value.trim();
  if (save) save.disabled = true;
}

async function refreshAfterLiveSaveIssue(opportunityId, phase, command, sourceGeneration) {
  if (sourceGeneration !== opportunitySourceGeneration) return;
  const refreshed = await loadOpportunities();
  if (sourceGeneration !== opportunitySourceGeneration) return;
  const message = refreshed
    ? (phase === 'conflict' ? 'The source changed. Latest data is loaded; review your preserved draft before saving again.' : 'Save outcome is unknown. Latest data is loaded; review it before trying again.')
    : (phase === 'conflict' ? 'The source changed, but the latest data could not be loaded. Your draft is preserved.' : 'Save outcome is unknown and the latest data could not be loaded. Your draft is preserved.');
  state.liveSaves.set(opportunityId, { command, phase, message });
  renderOpportunities();
}

async function saveLiveOpportunity(opportunityId, form) {
  const opportunity = state.opportunities.find(item => item.id === opportunityId);
  if (!state.liveOpportunities || !opportunity || !form) return;
  const sourceGeneration = opportunitySourceGeneration;
  const draft = {
    nextAction: recordText(form.elements.nextAction?.value),
    status: recordText(form.elements.status?.value),
  };
  state.liveDrafts.set(opportunityId, draft);
  const command = liveCommandFor(opportunity, draft);
  if (!command) {
    state.liveSaves.set(opportunityId, { phase: 'invalid' });
    renderOpportunities();
    return;
  }
  const endpoint = hudRuntimeEndpoint('hudOpportunitiesEndpoint', '/api/hud/opportunities');
  if (!endpoint) {
    state.liveSaves.set(opportunityId, { command, phase: 'unconnected' });
    renderOpportunities();
    return;
  }

  state.liveSaves.set(opportunityId, { command, phase: 'saving' });
  renderOpportunities();
  let response;
  let body;
  try {
    response = await fetch(`${endpoint.href}/${encodeURIComponent(opportunityId)}`, {
      body: JSON.stringify(command),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'PATCH',
      redirect: 'error',
    });
    body = await responseJSON(response);
  } catch {
    if (sourceGeneration !== opportunitySourceGeneration) return;
    await refreshAfterLiveSaveIssue(opportunityId, 'uncertain', command, sourceGeneration);
    return;
  }

  if (sourceGeneration !== opportunitySourceGeneration) return;

  if (response.ok) {
    try {
      if (sourceGeneration !== opportunitySourceGeneration) return;
      applyOpportunityPayload(body);
      if (sourceGeneration !== opportunitySourceGeneration) return;
      state.liveDrafts.delete(opportunityId);
      state.liveSaves.set(opportunityId, {
        command,
        message: body?.replayed ? 'Saved to the protected source (confirmed after retry).' : 'Saved to the protected source.',
        phase: 'saved',
      });
      renderOpportunities();
    } catch {
      if (sourceGeneration !== opportunitySourceGeneration) return;
      state.liveSaves.set(opportunityId, { command, phase: 'uncertain', message: 'The server confirmed a response, but the latest record could not be read. Your draft is preserved.' });
      renderOpportunities();
    }
    return;
  }
  if (response.status === 409 && body?.error === 'hud_conflict') {
    await refreshAfterLiveSaveIssue(opportunityId, 'conflict', command, sourceGeneration);
    return;
  }
  const phase = response.status === 403 ? 'access'
    : response.status === 409 ? 'unconnected'
      : response.status === 400 ? 'invalid'
        : response.status === 502 || response.status === 500 ? 'uncertain'
          : response.status === 503 ? 'unavailable' : 'error';
  if (phase === 'uncertain') {
    await refreshAfterLiveSaveIssue(opportunityId, phase, command, sourceGeneration);
    return;
  }
  if (sourceGeneration !== opportunitySourceGeneration) return;
  state.liveSaves.set(opportunityId, { command, phase });
  renderOpportunities();
}

function filteredOpportunities() {
  const search = $('#opportunity-search')?.value.trim().toLowerCase() ?? '';
  const status = $('#status-filter')?.value ?? 'all';
  const company = $('#company-filter')?.value ?? 'all';
  return state.opportunities.filter(opportunity => {
    const matchedSearch = !search || `${opportunity.company} ${opportunity.role} ${opportunity.summary}`.toLowerCase().includes(search);
    return matchedSearch && (status === 'all' || opportunity.status === status) && (company === 'all' || opportunity.companyId === company);
  });
}

function populateCompanyFilter() {
  const select = $('#company-filter');
  const current = select.value;
  const companies = state.liveOpportunities ? state.opportunities.map(opportunity => ({ id: opportunity.companyId, name: opportunity.company })) : state.targets;
  select.innerHTML = '<option value="all">All companies</option>' + companies.map(target => `<option value="${target.id}">${escapeHTML(target.name)}</option>`).join('');
  select.value = [...select.options].some(option => option.value === current) ? current : 'all';
}

function renderLiveOpportunityEditor(detail) {
  if (!liveRevision(detail.revision)) return '<p class="live-save-status is-error" role="status">This live record has no safe revision, so it cannot be saved from the HUD.</p>';
  const draft = liveDraftFor(detail);
  const save = liveSaveFor(detail.id);
  const saving = save.phase === 'saving';
  return `<form class="live-opportunity-editor" data-live-opportunity-form="${escapeHTML(detail.id)}">
      <p class="eyebrow">Update opportunity</p>
      <p class="live-edit-note">Only status and next action are saved to the protected source.</p>
      <label>Status
        <select name="status" ${saving ? 'disabled' : ''}>${liveStatusOptions(draft.status)}</select>
      </label>
      <label>Next action
        <textarea name="nextAction" maxlength="500" rows="3" ${saving ? 'disabled' : ''}>${escapeHTML(draft.nextAction)}</textarea>
      </label>
      <div class="live-save-actions"><button class="button button-navy" type="submit" ${saving ? 'disabled' : ''}>${saving ? 'Saving…' : 'Save changes'}</button><p class="live-save-status is-${escapeHTML(save.phase)}" role="status" aria-live="polite">${escapeHTML(liveSaveMessage(save))}</p></div>
    </form>`;
}

function renderOpportunities() {
  const addOpportunity = $('[data-open-dialog="opportunity"]');
  addOpportunity.disabled = state.liveOpportunities;
  addOpportunity.title = state.liveOpportunities ? 'Connected opportunities support status and next-action saves only.' : '';
  populateCompanyFilter();
  const opportunities = filteredOpportunities();
  if (!opportunities.some(opportunity => opportunity.id === state.selectedOpportunity)) state.selectedOpportunity = opportunities[0]?.id ?? null;
  $('#opportunity-list').innerHTML = opportunities.length ? opportunities.map(opportunity => `<button class="opportunity-card ${opportunity.id === state.selectedOpportunity ? 'is-selected' : ''}" type="button" data-opportunity-id="${opportunity.id}">
      <span class="opportunity-card-top"><span class="status-pill ${opportunity.statusClass ?? statusClass(opportunity.status)}">${escapeHTML(opportunity.status)}</span><span>${escapeHTML(opportunity.company)}</span></span>
      <h3>${escapeHTML(opportunity.role)}</h3><p>${escapeHTML(opportunity.summary)}</p>
    </button>`).join('') : `<div class="empty-state">${state.liveOpportunities ? 'No live opportunities are currently available from the protected source.' : 'No sample opportunities match these filters. Clear a filter or add a sample opportunity.'}</div>`;

  const detail = state.opportunities.find(opportunity => opportunity.id === state.selectedOpportunity);
  const liveDetail = state.liveOpportunities && detail;
  $('#opportunity-detail').innerHTML = detail ? `<div class="detail-meta"><span class="status-pill ${detail.statusClass ?? statusClass(detail.status)}">${escapeHTML(detail.status)}</span><span>${escapeHTML(detail.company)}</span></div>
    <h3>${escapeHTML(detail.role)}</h3><p class="detail-summary">${escapeHTML(detail.summary)}</p>
    <div class="detail-section"><h4>Why it could fit</h4><p>${escapeHTML(detail.fit)}</p></div>
    <div class="detail-section"><h4>Relationship context</h4><p>${escapeHTML(detail.contact)}</p></div>
    <div class="detail-section"><h4>Next action</h4><p>${escapeHTML(detail.nextAction.label)}</p></div>
    ${liveDetail ? renderLiveOpportunityEditor(detail) : `<div class="detail-section"><h4>Sample activity</h4><ul>${detail.activity.map(activity => `<li>${escapeHTML(activity)}</li>`).join('')}</ul></div><div class="detail-actions"><button class="button button-navy" type="button" data-complete-opportunity-action="${detail.id}">${detail.nextAction.complete ? 'Reopen next step' : 'Complete next step'}</button><button class="button button-quiet" type="button" data-open-dialog="opportunity" data-edit-opportunity="${detail.id}">Edit sample</button></div>`}` : `<div class="empty-state">${state.liveOpportunities ? 'Choose a live opportunity to see its detail.' : 'Choose a sample opportunity to see its detail.'}</div>`;
}

function renderContacts() {
  const connected = state.referenceConnection === 'connected';
  const list = $('#contacts-list');
  if (connected) {
    list.innerHTML = state.references.length
      ? state.references.map(renderLiveReference).join('')
      : '<article class="contact-card reference-empty" role="status"><p class="eyebrow">Private reference records</p><h3>No references available</h3><p>The protected source is connected but currently has no reference records to show.</p></article>';
  } else {
    list.innerHTML = state.contacts.map(contact => `<article class="contact-card"><p class="eyebrow">${escapeHTML(contact.context)}</p><h3>${escapeHTML(contact.name)}</h3><p>${escapeHTML(contact.detail)}</p><p><strong>${escapeHTML(contact.permission)}</strong></p><button class="text-action" type="button" data-log-contact="${contact.id}">Log sample follow-up</button></article>`).join('');
  }

  const copy = {
    sample: {
      detail: 'No private reference records are loaded.',
      heading: 'Reference source not connected',
      intro: 'Sample data. References not connected.',
      action: 'Connect references later',
    },
    loading: {
      detail: 'Checking the private reference source.',
      heading: 'Checking private reference source',
      intro: 'Checking private references.',
      action: 'Checking references',
    },
    connected: {
      detail: 'Read-only records. Drafts are not sent.',
      heading: state.references.length ? 'Private reference records loaded' : 'Private reference source is connected',
      intro: state.references.length ? 'Private references loaded.' : 'No private references returned.',
      action: 'Sending is not connected',
    },
    unconnected: {
      detail: 'No private reference records are loaded.',
      heading: 'Reference source is not connected',
      intro: 'Sample data. References unavailable.',
      action: 'References unavailable',
    },
    access: {
      detail: 'Private access is required.',
      heading: 'Private access required',
      intro: 'Sample data. Private access required.',
      action: 'References unavailable',
    },
    error: {
      detail: 'No private reference records are loaded.',
      heading: 'Private reference source is unavailable',
      intro: 'Sample data. Reference source unavailable.',
      action: 'References unavailable',
    },
  }[state.referenceConnection] || null;
  if (!copy) return;
  $('#references-intro').textContent = copy.intro;
  $('#reference-sync-heading').textContent = copy.heading;
  $('#reference-sync-detail').textContent = copy.detail;
  $('#reference-sync-action').textContent = copy.action;
  renderReadiness();
}

function renderReadiness() {
  const source = $('#readiness-contacts-source');
  const verified = $('#readiness-contacts-verified');
  if (!source || !verified) return;
  const status = {
    sample: ['Protected source when available', 'Not yet'],
    loading: ['Checking protected source', 'Pending'],
    connected: ['Protected source connected', 'Current response'],
    unconnected: ['Protected source unavailable', 'Not connected'],
    access: ['Private access required', 'Not verified'],
    error: ['Protected source unavailable', 'Not verified'],
  }[state.referenceConnection] || ['Protected source when available', 'Not yet'];
  [source.textContent, verified.textContent] = status;
}

function renderLiveReference(reference) {
  const contactLinks = [
    [trustedReferenceEmail(reference.workEmail), 'Work email'],
    [trustedReferenceEmail(reference.personalEmail), 'Personal email'],
    [trustedReferencePhone(reference.phone), 'Phone'],
    [trustedLinkedInUrl(reference.linkedinUrl), 'LinkedIn'],
  ].filter(([href]) => href);
  const details = [
    reference.sharedCompanies ? `<p><strong>Shared companies</strong><br>${escapeHTML(reference.sharedCompanies)}</p>` : '',
    reference.notes ? `<p><strong>Relationship notes</strong><br>${escapeHTML(reference.notes)}</p>` : '',
    reference.introductionDraft ? `<p><strong>Introduction draft — not sent</strong><br>${escapeHTML(reference.introductionDraft)}</p>` : '',
    reference.headsUpDraft ? `<p><strong>Heads-up draft — not sent</strong><br>${escapeHTML(reference.headsUpDraft)}</p>` : '',
  ].filter(Boolean).join('');
  return `<article class="contact-card reference-card"><p class="eyebrow">Reference ${escapeHTML(reference.referenceId)}</p><h3>${escapeHTML(reference.name)}</h3>${reference.preferredName && reference.preferredName !== reference.name ? `<p class="reference-preferred">Preferred name: ${escapeHTML(reference.preferredName)}</p>` : ''}<p class="reference-permission"><strong>Permission: ${escapeHTML(reference.permission)}</strong></p>${contactLinks.length ? `<p class="reference-links"><strong>Contact</strong><span>${contactLinks.map(([href, label]) => `<a href="${escapeHTML(href)}"${label === 'LinkedIn' ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHTML(label)}</a>`).join(' · ')}</span></p>` : ''}${details ? `<details class="reference-details"><summary>Read-only reference context</summary>${details}</details>` : '<p class="reference-muted">No additional reference context was supplied.</p>'}</article>`;
}

function renderMaterials() {
  $('#materials-list').innerHTML = state.documents.map(document => `<article class="material-card"><p class="eyebrow">${document.current ? 'Approved sample' : 'Tracked sample'}</p><h3>${escapeHTML(document.title)}</h3><p>${escapeHTML(document.detail)}</p><div class="version-row"><strong>${escapeHTML(document.version)}</strong><button class="text-action" type="button" data-set-document="${document.id}" ${document.current ? 'disabled' : ''}>${document.current ? 'Current' : 'Set current'}</button></div></article>`).join('');
}

function renderDirection() {
  $('#direction-content').innerHTML = `<section class="mandate-card panel"><p class="eyebrow">Career mandate</p><p>${escapeHTML(state.mandate)}</p><button class="text-action gold-text" type="button" data-open-dialog="mandate">Edit sample mandate</button></section>
    <section class="targets-card panel"><p class="eyebrow">Target companies</p><h3>Situations to explore</h3><ul class="target-list">${state.targets.map(target => `<li><strong>${escapeHTML(target.name)}</strong><span>${escapeHTML(target.reason)}</span></li>`).join('')}</ul></section>`;
}

function setDay(day) {
  state.selectedDay = day;
  $$('[data-day]').forEach(button => {
    const selected = button.dataset.day === day;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const selectedButton = $(`[data-day="${day}"]`);
  const label = selectedButton ? `${selectedButton.querySelector('strong').textContent} ${selectedButton.querySelector('span').textContent}` : 'Day';
  announce(`${label} selected in the sample week.`);
}

function openDialog(kind, editId = '') {
  if (state.liveOpportunities && ['action', 'opportunity'].includes(kind)) {
    announce('Connected records can update status and next action in Career; this control is unavailable.');
    return;
  }
  const dialog = $('#hud-dialog');
  const title = $('#dialog-title');
  const entryKind = $('#entry-kind');
  const entryId = $('#entry-id');
  const input = $('#entry-title');
  const company = $('#entry-company');
  const status = $('#entry-status');
  const detail = $('#entry-detail');
  const companyField = $('#company-field');
  const statusField = $('#status-field');
  const detailField = $('#detail-field');
  entryKind.value = kind;
  entryId.value = editId;
  $('#hud-form').reset();
  entryKind.value = kind;
  entryId.value = editId;
  companyField.hidden = !['opportunity'].includes(kind);
  statusField.hidden = !['opportunity'].includes(kind);
  detailField.hidden = kind === 'note';
  title.textContent = ({ action: 'Add a focus block', opportunity: editId ? 'Edit sample opportunity' : 'Add sample opportunity', note: 'Edit working note', mandate: 'Edit sample mandate', company: 'Add target company' })[kind];
  if (kind === 'note') { input.value = state.note.title; input.placeholder = 'Working note title'; detail.value = ''; }
  if (kind === 'mandate') { input.value = state.mandate; input.placeholder = 'Career mandate'; detailField.hidden = true; }
  if (kind === 'company') { input.placeholder = 'Company name'; detail.placeholder = 'Why this company belongs on the target list'; }
  if (kind === 'action') { input.placeholder = 'Sample focus block'; detail.placeholder = 'What moves this forward?'; }
  if (kind === 'opportunity' && editId) {
    const opportunity = state.opportunities.find(item => item.id === editId);
    input.value = opportunity.role;
    company.value = opportunity.company;
    status.value = opportunity.status;
    detail.value = opportunity.summary;
  }
  if (kind === 'opportunity' && !editId) { input.placeholder = 'Role title'; company.placeholder = 'Company name'; detail.placeholder = 'Short sample summary'; }
  dialog.showModal();
  window.setTimeout(() => input.focus(), 0);
}

function closeDialog() { $('#hud-dialog').close(); }

function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'sample'; }

function saveDialog(event) {
  event.preventDefault();
  const kind = $('#entry-kind').value;
  const editId = $('#entry-id').value;
  const title = $('#entry-title').value.trim();
  const company = $('#entry-company').value.trim();
  const status = $('#entry-status').value;
  const detail = $('#entry-detail').value.trim();
  if (!title) { $('#entry-title').focus(); announce('Add a title before saving the sample change.'); return; }
  if (kind === 'action') {
    state.focusItems.unshift({ id: `focus_sample_${state.focusItems.length + 1}`, time: 'Next', title, detail: detail || 'New sample focus block.', expanded: detail || 'Capture the next useful step.', complete: false });
    state.focusFilter = 'all';
    state.expandedFocus = state.focusItems[0].id;
    renderToday();
    announce('Sample focus block added for this session.');
  }
  if (kind === 'note') { state.note.title = title; renderToday(); announce('Sample working note updated.'); }
  if (kind === 'mandate') { state.mandate = title; renderDirection(); announce('Sample mandate updated.'); }
  if (kind === 'company') {
    const id = `company_sample_${state.targets.length + 1}`;
    state.targets.push({ id, name: title, reason: detail || 'Sample target company' });
    renderDirection();
    announce('Sample target company added.');
  }
  if (kind === 'opportunity') {
    if (!company) { $('#entry-company').focus(); announce('Add a company before saving the sample opportunity.'); return; }
    if (editId) {
      const opportunity = state.opportunities.find(item => item.id === editId);
      opportunity.role = title;
      opportunity.company = company;
      opportunity.status = status;
      opportunity.summary = detail || 'Sample opportunity summary.';
      opportunity.companyId = opportunity.companyId || `company_${slug(company)}`;
      state.selectedOpportunity = editId;
      announce('Sample opportunity updated.');
    } else {
      const companyId = `company_${slug(company)}`;
      if (!state.targets.some(target => target.id === companyId)) state.targets.push({ id: companyId, name: company, reason: 'Added in sample preview' });
      const id = `opportunity_sample_${state.opportunities.length + 1}`;
      state.opportunities.unshift({ id, companyId, company, role: title, status, summary: detail || 'Sample opportunity summary.', fit: 'Add fit notes after a private backend is connected.', contact: 'Sample relationship · not connected', nextAction: { id: `activity_${id}`, label: 'Define the first useful next step', complete: false }, activity: ['Created in this sample session'] });
      state.selectedOpportunity = id;
      announce('Sample opportunity added.');
    }
    populateCompanyFilter();
    renderOpportunities();
  }
  closeDialog();
}

function handleClick(event) {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { event.preventDefault(); showView(viewButton.dataset.view); return; }
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) { setDay(dayButton.dataset.day); return; }
  const scheduleButton = event.target.closest('[data-schedule]');
  if (scheduleButton) {
    state.schedule = scheduleButton.dataset.schedule;
    $$('[data-schedule]').forEach(button => button.classList.toggle('is-selected', button === scheduleButton));
    announce(state.schedule === 'today' ? 'Showing today’s sample focus.' : 'This-week view is represented by the sample schedule.');
    return;
  }
  const focusButton = event.target.closest('[data-focus-id]');
  if (focusButton) { state.expandedFocus = state.expandedFocus === focusButton.dataset.focusId ? '' : focusButton.dataset.focusId; renderToday(); return; }
  const completeFocus = event.target.closest('[data-complete-focus]');
  if (completeFocus) {
    if (state.liveOpportunities) { announce('Connected follow-ups are view-only here. Update status or next action in Career.'); return; }
    runOnce(completeFocus, () => {
      const item = state.focusItems.find(value => value.id === completeFocus.dataset.completeFocus);
      item.complete = !item.complete;
      renderToday();
      announce(item.complete ? 'Sample focus block completed.' : 'Sample focus block reopened.');
    });
    return;
  }
  const noteTab = event.target.closest('[data-note-tab]');
  if (noteTab) { state.noteTab = noteTab.dataset.noteTab; updateNoteTabs(); return; }
  const opportunity = event.target.closest('[data-opportunity-id]');
  if (opportunity) { state.selectedOpportunity = opportunity.dataset.opportunityId; renderOpportunities(); return; }
  const completeOpportunity = event.target.closest('[data-complete-opportunity-action]');
  if (completeOpportunity) {
    if (state.liveOpportunities) { announce('Connected records can update status and next action in Career; completing a sample step is unavailable.'); return; }
    runOnce(completeOpportunity, () => {
      const item = state.opportunities.find(value => value.id === completeOpportunity.dataset.completeOpportunityAction);
      item.nextAction.complete = !item.nextAction.complete;
      item.activity.unshift(item.nextAction.complete ? 'Sample next step completed' : 'Sample next step reopened');
      renderOpportunities();
      announce(item.nextAction.complete ? 'Sample next step completed.' : 'Sample next step reopened.');
    });
    return;
  }
  const connectionTest = event.target.closest('[data-test-connection]');
  if (connectionTest) { testConnection(connectionTest.dataset.testConnection); return; }
  const connectionSave = event.target.closest('[data-save-connection]');
  if (connectionSave) { saveConnection(connectionSave.dataset.saveConnection); return; }
  const openDialogButton = event.target.closest('[data-open-dialog]');
  if (openDialogButton) { openDialog(openDialogButton.dataset.openDialog, openDialogButton.dataset.editOpportunity); return; }
  if (event.target.closest('[data-close-dialog]')) { closeDialog(); return; }
  const setDocument = event.target.closest('[data-set-document]');
  if (setDocument) {
    runOnce(setDocument, () => {
      state.documents.forEach(document => { document.current = document.id === setDocument.dataset.setDocument; });
      renderMaterials();
      announce('Sample material marked current.');
    });
    return;
  }
  const contact = event.target.closest('[data-log-contact]');
  if (contact) { announce('Sample follow-up logged locally; no person was contacted.'); return; }
}

function setupParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const photo = $('.hero-photo');
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const x = ((event.clientX / window.innerWidth) - .5) * -6;
    const y = ((event.clientY / window.innerHeight) - .5) * -4;
    photo.style.setProperty('--parallax-x', `${x}px`);
    photo.style.setProperty('--parallax-y', `${y}px`);
  }, { passive: true });
}

function captureLiveDraft(event) {
  const form = event.target.closest?.('[data-live-opportunity-form]');
  if (!form || !['status', 'nextAction'].includes(event.target.name)) return;
  const opportunityId = form.dataset.liveOpportunityForm;
  state.liveDrafts.set(opportunityId, {
    nextAction: recordText(form.elements.nextAction?.value),
    status: recordText(form.elements.status?.value),
  });
  const save = state.liveSaves.get(opportunityId);
  if (save && save.phase !== 'saving') state.liveSaves.set(opportunityId, { phase: 'idle' });
}

function init() {
  updateHeaderContext();
  clockTimer = window.setInterval(updateHeaderContext, 30_000);
  const initialView = historyView();
  if (initialView) state.activeView = initialView;
  showView(state.activeView, { historyMode: 'replace', focus: false });
  renderToday();
  renderOpportunities();
  renderContacts();
  renderMaterials();
  renderDirection();
  loadOpportunities();
  loadReferences();
  loadConnections();
  loadPrivatePhoto();
  photoTimer = window.setInterval(loadPrivatePhoto, PHOTO_ROTATION_MS);
  document.addEventListener('click', handleClick);
  document.addEventListener('change', event => {
    captureLiveDraft(event);
    if (event.target.matches('#focus-status')) { state.focusFilter = event.target.value; renderToday(); }
    if (event.target.matches('[data-note-action]')) {
      const action = state.note.actions.find(value => value.id === event.target.dataset.noteAction);
      action.complete = event.target.checked;
      announce(action.complete ? 'Sample note action completed.' : 'Sample note action reopened.');
    }
    if (event.target.matches('#opportunity-search, #status-filter, #company-filter')) renderOpportunities();
  });
  document.addEventListener('input', event => {
    captureLiveDraft(event);
    captureConnectionDraft(event);
    if (event.target.matches('#opportunity-search')) renderOpportunities();
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest?.('[data-live-opportunity-form]');
    if (!form) return;
    event.preventDefault();
    saveLiveOpportunity(form.dataset.liveOpportunityForm, form);
  });
  $('#hud-form').addEventListener('submit', saveDialog);
  $('#hud-menu-toggle').addEventListener('click', event => {
    setHudMenu(event.currentTarget.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setHudMenu(false);
  });
  window.addEventListener('popstate', () => {
    const view = historyView();
    if (view) showView(view, { historyMode: 'none' });
  });
  window.addEventListener('hashchange', () => {
    const view = historyView();
    if (view && view !== state.activeView) showView(view, { historyMode: 'none' });
  });
  $('#filter-toggle').addEventListener('click', event => {
    const form = $('#focus-filter');
    form.hidden = !form.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!form.hidden));
  });
  $('#review-today').addEventListener('click', event => runOnce(event.currentTarget, () => {
    state.expandedFocus = 'focus_followups';
    renderToday();
    $('#focus-list').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    announce('Today is ready for review in this sample workspace.');
  }));
  $('#hud-use-location').addEventListener('click', requestDeviceLocation);
  $('#hud-manual-location').addEventListener('click', setManualLocation);
  void startAutomaticLocation();
  setupParallax();
}

init();
