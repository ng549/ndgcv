const state = {
  activeView: 'career',
  liveOpportunities: false,
  liveDrafts: new Map(),
  liveSaves: new Map(),
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

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
let toastTimer;
let clockTimer;
let photoTimer;
let activePhotoSlot = 'b';
let activePhotoObjectUrl = null;
let photoRequestInFlight = false;

const PHOTO_ROTATION_MS = 20_000;
const LIVE_STATUS_VALUES = ['research', 'research_lead', 'interested', 'conversation', 'applied', 'interview', 'offer', 'paused', 'closed', 'declined'];
const LIVE_REVISION_PATTERN = /^[a-f0-9]{64}$/;
const REFERENCE_ID_PATTERN = /^REF-[A-Za-z0-9_-]{1,128}$/;
const REFERENCE_PERMISSION_VALUES = new Set(['Agreed', 'Ask first', 'Unavailable']);
const REFERENCES_MAX_BYTES = 2 * 1024 * 1024;
const REFERENCES_MAX_RECORDS = 999;

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
  $('#hud-location').textContent = location;
  announce('Manual location saved in this browser session. Weather remains unavailable.');
}

function requestDeviceLocation() {
  if (!navigator.geolocation) {
    announce('Device location is unavailable in this browser. Set a location manually instead.');
    return;
  }
  const button = $('#hud-use-location');
  button.disabled = true;
  navigator.geolocation.getCurrentPosition(
    () => {
      $('#hud-location').textContent = 'Device location available';
      button.disabled = false;
      announce('Device location is available for this browser session. Weather remains unavailable.');
    },
    () => {
      button.disabled = false;
      announce('Location permission was not granted. Set a location manually instead.');
    },
    { enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 10_000 }
  );
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
    loading: ['Checking private source', 'No sync result is available yet.'],
    fresh: ['Private opportunities loaded', 'Records came from the protected source for this visit.'],
    stale: ['Private source needs refresh', 'The last successful refresh is older than the source policy.'],
    error: ['Private source is unavailable', 'No new data or links were loaded.'],
    unconnected: ['Not connected', 'Live records and private links are unavailable in this preview.']
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
  $('#career-intro').textContent = 'Protected opportunities, conversations, and next steps from the connected source.';
  renderRuntimeStatus({ state: 'fresh' });
  renderRuntimeLinks(payload.links);
  renderToday();
  renderOpportunities();
}

async function loadOpportunities() {
  const endpoint = hudRuntimeEndpoint('hudOpportunitiesEndpoint', '/api/hud/opportunities');
  if (!endpoint) return;
  renderRuntimeStatus({ state: 'loading' });
  try {
    const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, redirect: 'error' });
    if (response.status === 204 || response.status === 404 || response.status === 409) {
      renderRuntimeStatus();
      renderRuntimeLinks();
      return;
    }
    if (!response.ok) throw new Error(`Private runtime request failed (${response.status}).`);
    applyOpportunityPayload(await response.json());
    return true;
  } catch {
    renderRuntimeStatus({ state: 'error' });
    renderRuntimeLinks();
  }
  return false;
}

async function loadReferences() {
  const endpoint = hudRuntimeEndpoint('hudReferencesEndpoint', '/api/hud/references');
  if (!endpoint) return false;
  state.referenceConnection = 'loading';
  renderContacts();
  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      redirect: 'error'
    });
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
    state.references = normalizeLiveReferences(await readBoundedReferencesJson(response));
    state.referenceConnection = 'connected';
    renderContacts();
    return true;
  } catch {
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
  if (!endpoint || !frame || photoRequestInFlight) return;

  photoRequestInFlight = true;
  renderPrivatePhotoState('Checking private source');
  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { Accept: 'image/jpeg' }
    });
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

    const nextSlot = activePhotoSlot === 'a' ? 'b' : 'a';
    const incoming = $(`#hud-private-photo-${nextSlot}`);
    const outgoing = $(`#hud-private-photo-${activePhotoSlot}`);
    const nextObjectUrl = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      incoming.onload = resolve;
      incoming.onerror = () => reject(new Error('Private photo could not be rendered.'));
      incoming.src = nextObjectUrl;
    });

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
    renderPrivatePhotoState('Private source unavailable');
  } finally {
    photoRequestInFlight = false;
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

function showView(view) {
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
  if (view === 'today') renderToday();
  $('#hud-main').focus({ preventScroll: true });
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

async function refreshAfterLiveSaveIssue(opportunityId, phase, command) {
  const refreshed = await loadOpportunities();
  const message = refreshed
    ? (phase === 'conflict' ? 'The source changed. Latest data is loaded; review your preserved draft before saving again.' : 'Save outcome is unknown. Latest data is loaded; review it before trying again.')
    : (phase === 'conflict' ? 'The source changed, but the latest data could not be loaded. Your draft is preserved.' : 'Save outcome is unknown and the latest data could not be loaded. Your draft is preserved.');
  state.liveSaves.set(opportunityId, { command, phase, message });
  renderOpportunities();
}

async function saveLiveOpportunity(opportunityId, form) {
  const opportunity = state.opportunities.find(item => item.id === opportunityId);
  if (!state.liveOpportunities || !opportunity || !form) return;
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
    await refreshAfterLiveSaveIssue(opportunityId, 'uncertain', command);
    return;
  }

  if (response.ok) {
    try {
      applyOpportunityPayload(body);
      state.liveDrafts.delete(opportunityId);
      state.liveSaves.set(opportunityId, {
        command,
        message: body?.replayed ? 'Saved to the protected source (confirmed after retry).' : 'Saved to the protected source.',
        phase: 'saved',
      });
      renderOpportunities();
    } catch {
      state.liveSaves.set(opportunityId, { command, phase: 'uncertain', message: 'The server confirmed a response, but the latest record could not be read. Your draft is preserved.' });
      renderOpportunities();
    }
    return;
  }
  if (response.status === 409 && body?.error === 'hud_conflict') {
    await refreshAfterLiveSaveIssue(opportunityId, 'conflict', command);
    return;
  }
  const phase = response.status === 403 ? 'access'
    : response.status === 409 ? 'unconnected'
      : response.status === 400 ? 'invalid'
        : response.status === 502 || response.status === 500 ? 'uncertain'
          : response.status === 503 ? 'unavailable' : 'error';
  if (phase === 'uncertain') {
    await refreshAfterLiveSaveIssue(opportunityId, phase, command);
    return;
  }
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
      detail: 'The approved future source is a Google Sheet. This preview does not read its rows, create a connection, or contact anyone.',
      heading: 'Google Sheet connection is not set up',
      intro: 'Sample relationship context only. Existing reference records remain unconnected.',
      action: 'Connect references later',
    },
    loading: {
      detail: 'Checking the private reference source. Sample relationship cards remain visible until a valid response is received.',
      heading: 'Checking private reference source',
      intro: 'Sample relationship context remains visible while the private source is checked.',
      action: 'Checking references',
    },
    connected: {
      detail: 'Read-only private reference records are shown here. Contact links open only on your action; drafts are not sent from the HUD.',
      heading: state.references.length ? 'Private reference records loaded' : 'Private reference source is connected',
      intro: state.references.length ? 'Private reference context is loaded for this visit. Drafts remain read-only and unsent.' : 'The private source returned no reference records for this visit.',
      action: 'Sending is not connected',
    },
    unconnected: {
      detail: 'The private reference source is not connected. Sample relationship cards remain local to this preview.',
      heading: 'Reference source is not connected',
      intro: 'Sample relationship context is visible because private reference records are unavailable.',
      action: 'References unavailable',
    },
    access: {
      detail: 'Private access is required before reference records can be shown. No reference was contacted or changed.',
      heading: 'Private access required',
      intro: 'Sample relationship context is visible because private reference access was not granted.',
      action: 'References unavailable',
    },
    error: {
      detail: 'The private reference source is unavailable. Sample relationship cards remain local to this preview.',
      heading: 'Private reference source is unavailable',
      intro: 'Sample relationship context is visible because no valid private reference response was received.',
      action: 'References unavailable',
    },
  }[state.referenceConnection] || null;
  if (!copy) return;
  $('#references-intro').textContent = copy.intro;
  $('#reference-sync-heading').textContent = copy.heading;
  $('#reference-sync-detail').textContent = copy.detail;
  $('#reference-sync-action').textContent = copy.action;
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
  showView(state.activeView);
  renderToday();
  renderOpportunities();
  renderContacts();
  renderMaterials();
  renderDirection();
  loadOpportunities();
  loadReferences();
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
  setupParallax();
}

init();
