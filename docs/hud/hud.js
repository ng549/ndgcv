const state = {
  activeView: 'career',
  selectedDay: 'Tue',
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

const privateMedia = {
  visibleLayer: 0,
  fingerprint: '',
  objectUrls: [null, null],
  timer: 0,
  loading: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
let toastTimer;

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

function showView(view) {
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
      ${expanded ? `<div class="focus-expanded"><p>${escapeHTML(item.expanded)}</p><button class="complete-link" type="button" data-complete-focus="${item.id}">${item.complete ? 'Reopen this sample focus block' : 'Complete this focus block'}</button></div>` : ''}
    </li>`;
  }).join('') : '<li class="empty-state">No sample focus blocks match this filter.</li>';

  const noteActions = $('#note-actions');
  noteActions.innerHTML = `<ul class="check-list">${state.note.actions.map(action => `<li><input id="${action.id}" type="checkbox" data-note-action="${action.id}" ${action.complete ? 'checked' : ''}><label for="${action.id}">${escapeHTML(action.label)}</label></li>`).join('')}</ul>`;
  $('#note-notes').innerHTML = `<p class="note-prompt">${escapeHTML(state.note.prompts[0])}</p><p class="note-prompt">${escapeHTML(state.note.prompts[1])}</p>`;
  $('#note-heading').textContent = state.note.title;
  const nextFocus = state.focusItems.find(item => !item.complete);
  const incompleteNote = state.note.actions.find(action => !action.complete);
  $('#opportunity-status-count').textContent = `${state.opportunities.length} sample opportunities`;
  $('#next-action-title').textContent = incompleteNote?.label || nextFocus?.title || 'No open sample action';
  $('#today-progress').textContent = `${state.focusItems.filter(item => item.complete).length} of ${state.focusItems.length} sample blocks complete`;
  updateNoteTabs();
}

function setCurrentDate() {
  const now = new Date();
  const date = $('#current-date');
  const time = $('#current-time');
  const month = $('#month-label');
  date.dateTime = now.toISOString();
  date.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
  time.dateTime = now.toISOString();
  time.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
  month.textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(now);
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now);
  if ($(`[data-day="${day}"]`)) setDay(day, { announceSelection: false });
}

function setManualLocation(value, announcement = '') {
  const location = value.trim();
  if (!location) return;
  $('#location-display').textContent = location;
  $('#weather-display').textContent = 'Weather unavailable';
  if (announcement) announce(announcement);
}

function setupLocationControls() {
  const controls = $('#location-controls');
  const toggle = $('#location-toggle');
  toggle.addEventListener('click', () => {
    controls.hidden = !controls.hidden;
    toggle.setAttribute('aria-expanded', String(!controls.hidden));
    if (!controls.hidden) $('#location-input').focus();
  });
  controls.addEventListener('submit', event => {
    event.preventDefault();
    const field = $('#location-input');
    if (!field.value.trim()) { field.focus(); return; }
    setManualLocation(field.value, 'Location saved for this preview session. Weather remains unavailable.');
    controls.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });
  $('#use-device-location').addEventListener('click', () => {
    if (!navigator.geolocation) { announce('Device location is unavailable. Enter a location manually.'); return; }
    const deviceButton = $('#use-device-location');
    runOnce(deviceButton, () => {
      $('#location-display').textContent = 'Requesting device location…';
      navigator.geolocation.getCurrentPosition(
        position => {
          const latitude = position.coords.latitude.toFixed(3);
          const longitude = position.coords.longitude.toFixed(3);
          setManualLocation(`Device location · ${latitude}, ${longitude}`, 'Device location saved for this preview session. Weather remains unavailable.');
        },
        () => {
          $('#location-display').textContent = 'Location not set';
          announce('Device location was unavailable. Enter a location manually.');
        },
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
      );
    });
  });
}

function formatActualSyncTime(value) {
  if (typeof value !== 'string' || !value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function renderSyncStatus({ state: syncState = 'unconnected', lastSuccessfulAt = null } = {}) {
  const allowedStates = new Set(['loading', 'fresh', 'stale', 'error']);
  const phase = allowedStates.has(syncState) ? syncState : 'unconnected';
  const copy = {
    loading: ['Checking private source', 'No sync result is available yet.'],
    fresh: ['Private source is current', 'The private source reported a successful refresh.'],
    stale: ['Private source needs refresh', 'The last successful refresh is older than the source policy.'],
    error: ['Private source is unavailable', 'No new data was loaded.'],
    unconnected: ['Not connected', 'No private source is available in this preview.']
  }[phase];
  const element = $('#sync-status');
  const lastSuccess = formatActualSyncTime(lastSuccessfulAt);
  element.dataset.syncState = phase;
  $('#sync-status-title').textContent = copy[0];
  $('#sync-status-detail').textContent = copy[1];
  const time = $('#sync-last-success');
  time.hidden = !lastSuccess;
  if (lastSuccess) {
    time.dateTime = new Date(lastSuccessfulAt).toISOString();
    time.textContent = `Last successful sync: ${lastSuccess}`;
  }
}

const PRIVATE_PHOTO_INTERVAL_MS = 20000;

function privatePhotoEndpoint() {
  const value = document.documentElement.dataset.privatePhotoEndpoint;
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== '/api/hud/photo' || url.search || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}

function setPrivatePhotoState(phase, { preserveImage = true } = {}) {
  const frame = $('.memory-frame');
  const copy = {
    access: ['Private photo', 'Private access is required.'],
    loading: ['Private photo', 'Checking the protected source…'],
    ready: ['Private photo', 'Protected source connected.'],
    unconnected: ['Private photo', 'Not connected.'],
    unavailable: ['Private photo', 'Protected source unavailable.']
  }[phase] || ['Private photo', 'Not connected.'];
  frame.dataset.privatePhotoState = phase;
  $('#memory-frame-title').textContent = copy[0];
  $('#photo-frame-detail').textContent = copy[1];
  if (!preserveImage) {
    $$('[data-photo-layer]').forEach((layer, index) => {
      if (privateMedia.objectUrls[index]) URL.revokeObjectURL(privateMedia.objectUrls[index]);
      privateMedia.objectUrls[index] = null;
      layer.removeAttribute('src');
      layer.hidden = true;
      layer.classList.remove('is-visible');
    });
    privateMedia.fingerprint = '';
  }
}

async function photoFingerprint(blob) {
  if (!globalThis.crypto?.subtle) return `${blob.type}:${blob.size}`;
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function imageReady(image) {
  if (typeof image.decode === 'function') return image.decode();
  return new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', reject, { once: true });
  });
}

async function showProtectedPhoto(blob, fingerprint) {
  if (fingerprint && fingerprint === privateMedia.fingerprint) {
    setPrivatePhotoState('ready');
    return;
  }
  const layers = $$('[data-photo-layer]');
  const previousLayer = privateMedia.visibleLayer;
  const nextLayer = layers[previousLayer]?.classList.contains('is-visible') ? 1 - previousLayer : 0;
  const image = layers[nextLayer];
  const objectUrl = URL.createObjectURL(blob);
  image.src = objectUrl;
  image.alt = '';
  image.decoding = 'async';
  image.hidden = false;
  try {
    await imageReady(image);
  } catch {
    URL.revokeObjectURL(objectUrl);
    image.removeAttribute('src');
    image.hidden = true;
    throw new Error('Private photo could not be decoded.');
  }
  if (privateMedia.objectUrls[nextLayer]) URL.revokeObjectURL(privateMedia.objectUrls[nextLayer]);
  privateMedia.objectUrls[nextLayer] = objectUrl;
  const hasVisibleImage = layers[previousLayer]?.classList.contains('is-visible');
  if (hasVisibleImage) {
    requestAnimationFrame(() => {
      image.classList.add('is-visible');
      layers[previousLayer].classList.remove('is-visible');
    });
  } else {
    image.classList.add('is-visible');
  }
  privateMedia.visibleLayer = nextLayer;
  privateMedia.fingerprint = fingerprint;
  setPrivatePhotoState('ready');
}

async function loadProtectedPhoto() {
  if (privateMedia.loading) return;
  const endpoint = privatePhotoEndpoint();
  if (!endpoint) {
    setPrivatePhotoState('unconnected', { preserveImage: false });
    return;
  }
  privateMedia.loading = true;
  const hasVisibleImage = $$('[data-photo-layer]').some(layer => layer.classList.contains('is-visible'));
  if (!hasVisibleImage) setPrivatePhotoState('loading', { preserveImage: true });
  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { Accept: 'image/jpeg' }
    });
    if (response.status === 403) {
      setPrivatePhotoState('access', { preserveImage: hasVisibleImage });
      return;
    }
    if (response.status === 404 || response.status === 409) {
      setPrivatePhotoState('unconnected', { preserveImage: hasVisibleImage });
      return;
    }
    if (!response.ok || !/^image\/jpeg(?:;|$)/i.test(response.headers.get('Content-Type') || '')) {
      setPrivatePhotoState('unavailable', { preserveImage: hasVisibleImage });
      return;
    }
    const blob = await response.blob();
    if (!blob.size || !/^image\/jpeg$/i.test(blob.type || 'image/jpeg')) throw new Error('Invalid protected photo response.');
    await showProtectedPhoto(blob, await photoFingerprint(blob));
  } catch {
    setPrivatePhotoState('unavailable', { preserveImage: hasVisibleImage });
  } finally {
    privateMedia.loading = false;
  }
}

function trustedRuntimeUrl(value, kind) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (kind === 'drive' && url.protocol === 'https:' && url.hostname === 'drive.google.com') return url.href;
    if (kind === 'planning' && url.origin === window.location.origin && url.pathname.startsWith('/')) return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
  return null;
}

function renderPrivateLinks(links) {
  const group = $('#private-links');
  const drive = $('#drive-home-link');
  const planning = $('#module-planning-link');
  const driveHref = trustedRuntimeUrl(links?.driveHome, 'drive');
  const planningHref = trustedRuntimeUrl(links?.modulePlanning, 'planning');
  drive.hidden = !driveHref;
  planning.hidden = !planningHref;
  if (driveHref) drive.href = driveHref;
  else drive.removeAttribute('href');
  if (planningHref) planning.href = planningHref;
  else planning.removeAttribute('href');
  group.hidden = !driveHref && !planningHref;
}

function applyPrivateRuntime(payload) {
  if (!payload || typeof payload !== 'object' || !payload.sync || typeof payload.sync !== 'object') throw new TypeError('Invalid private runtime payload.');
  renderSyncStatus(payload.sync);
  renderPrivateLinks(payload.links);
}

async function loadPrivateRuntime() {
  const endpoint = document.documentElement.dataset.privateRuntimeEndpoint;
  if (!endpoint) return;
  renderSyncStatus({ state: 'loading' });
  try {
    const response = await fetch(endpoint, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (response.status === 204 || response.status === 404) {
      renderSyncStatus();
      renderPrivateLinks();
      return;
    }
    if (!response.ok) throw new Error(`Private runtime request failed (${response.status}).`);
    applyPrivateRuntime(await response.json());
  } catch {
    renderSyncStatus({ state: 'error' });
    renderPrivateLinks();
  }
}

function setupPrivateMedia() {
  setPrivatePhotoState('unconnected', { preserveImage: false });
  loadPrivateRuntime();
  loadProtectedPhoto();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    privateMedia.timer = window.setInterval(loadProtectedPhoto, PRIVATE_PHOTO_INTERVAL_MS);
  }
}

function updateNoteTabs() {
  $$('[data-note-tab]').forEach(button => {
    const selected = button.dataset.noteTab === state.noteTab;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  $$('[data-note-panel]').forEach(panel => { panel.hidden = panel.dataset.notePanel !== state.noteTab; });
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
  select.innerHTML = '<option value="all">All companies</option>' + state.targets.map(target => `<option value="${target.id}">${escapeHTML(target.name)}</option>`).join('');
  select.value = [...select.options].some(option => option.value === current) ? current : 'all';
}

function renderOpportunities() {
  populateCompanyFilter();
  const opportunities = filteredOpportunities();
  if (!opportunities.some(opportunity => opportunity.id === state.selectedOpportunity)) state.selectedOpportunity = opportunities[0]?.id ?? null;
  $('#opportunity-list').innerHTML = opportunities.length ? opportunities.map(opportunity => `<button class="opportunity-card ${opportunity.id === state.selectedOpportunity ? 'is-selected' : ''}" type="button" data-opportunity-id="${opportunity.id}">
      <span class="opportunity-card-top"><span class="status-pill ${opportunity.status}">${escapeHTML(opportunity.status)}</span><span>${escapeHTML(opportunity.company)}</span></span>
      <h3>${escapeHTML(opportunity.role)}</h3><p>${escapeHTML(opportunity.summary)}</p>
    </button>`).join('') : '<div class="empty-state">No sample opportunities match these filters. Clear a filter or add a sample opportunity.</div>';

  const detail = state.opportunities.find(opportunity => opportunity.id === state.selectedOpportunity);
  $('#opportunity-detail').innerHTML = detail ? `<div class="detail-meta"><span class="status-pill ${detail.status}">${escapeHTML(detail.status)}</span><span>${escapeHTML(detail.company)}</span></div>
    <h3>${escapeHTML(detail.role)}</h3><p class="detail-summary">${escapeHTML(detail.summary)}</p>
    <div class="detail-section"><h4>Why it could fit</h4><p>${escapeHTML(detail.fit)}</p></div>
    <div class="detail-section"><h4>Relationship context</h4><p>${escapeHTML(detail.contact)}</p></div>
    <div class="detail-section"><h4>Sample activity</h4><ul>${detail.activity.map(activity => `<li>${escapeHTML(activity)}</li>`).join('')}</ul></div>
    <div class="detail-actions"><button class="button button-navy" type="button" data-complete-opportunity-action="${detail.id}">${detail.nextAction.complete ? 'Reopen next step' : 'Complete next step'}</button><button class="button button-quiet" type="button" data-open-dialog="opportunity" data-edit-opportunity="${detail.id}">Edit sample</button></div>` : '<div class="empty-state">Choose a sample opportunity to see its detail.</div>';
}

function renderContacts() {
  $('#contacts-list').innerHTML = state.contacts.map(contact => `<article class="contact-card"><p class="eyebrow">${escapeHTML(contact.context)}</p><h3>${escapeHTML(contact.name)}</h3><p>${escapeHTML(contact.detail)}</p><p><strong>${escapeHTML(contact.permission)}</strong></p><button class="text-action" type="button" data-log-contact="${contact.id}">Log sample follow-up</button></article>`).join('');
}

function renderMaterials() {
  $('#materials-list').innerHTML = state.documents.map(document => `<article class="material-card"><p class="eyebrow">${document.current ? 'Approved sample' : 'Tracked sample'}</p><h3>${escapeHTML(document.title)}</h3><p>${escapeHTML(document.detail)}</p><div class="version-row"><strong>${escapeHTML(document.version)}</strong><button class="text-action" type="button" data-set-document="${document.id}" ${document.current ? 'disabled' : ''}>${document.current ? 'Current' : 'Set current'}</button></div></article>`).join('');
}

function renderDirection() {
  $('#direction-content').innerHTML = `<section class="mandate-card panel glass-panel"><p class="eyebrow">Career mandate</p><p>${escapeHTML(state.mandate)}</p><button class="text-action gold-text" type="button" data-open-dialog="mandate">Edit sample mandate</button></section>
    <section class="targets-card panel glass-panel"><p class="eyebrow">Target companies</p><h3>Situations to explore</h3><ul class="target-list">${state.targets.map(target => `<li><strong>${escapeHTML(target.name)}</strong><span>${escapeHTML(target.reason)}</span></li>`).join('')}</ul></section>`;
}

function setDay(day, { announceSelection = true } = {}) {
  state.selectedDay = day;
  $$('[data-day]').forEach(button => {
    const selected = button.dataset.day === day;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (announceSelection) announce(`${day} selected in the sample week.`);
}

function openDialog(kind, editId = '') {
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

function setupGlassDepth() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = $('.hero');
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * .7;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * -.55;
    hero.style.setProperty('--glass-tilt-x', `${x.toFixed(3)}deg`);
    hero.style.setProperty('--glass-tilt-y', `${y.toFixed(3)}deg`);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--glass-tilt-x', '0deg');
    hero.style.setProperty('--glass-tilt-y', '0deg');
  });
}

function init() {
  renderToday();
  renderOpportunities();
  renderContacts();
  renderMaterials();
  renderDirection();
  setCurrentDate();
  window.setInterval(setCurrentDate, 60000);
  setupLocationControls();
  setupPrivateMedia();
  setupGlassDepth();
  document.addEventListener('click', handleClick);
  document.addEventListener('change', event => {
    if (event.target.matches('#focus-status')) { state.focusFilter = event.target.value; renderToday(); }
    if (event.target.matches('[data-note-action]')) {
      const action = state.note.actions.find(value => value.id === event.target.dataset.noteAction);
      action.complete = event.target.checked;
      renderToday();
      announce(action.complete ? 'Sample note action completed.' : 'Sample note action reopened.');
    }
    if (event.target.matches('#opportunity-search, #status-filter, #company-filter')) renderOpportunities();
  });
  document.addEventListener('input', event => { if (event.target.matches('#opportunity-search')) renderOpportunities(); });
  $('#hud-form').addEventListener('submit', saveDialog);
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
}

init();
