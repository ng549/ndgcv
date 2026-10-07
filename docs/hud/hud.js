const state = {
  activeView: 'today',
  liveOpportunities: false,
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

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
let toastTimer;

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

function statusClass(value) {
  const allowed = new Set(['research', 'research_lead', 'interested', 'conversation', 'applied', 'interview', 'offer', 'paused', 'closed', 'declined']);
  const status = recordText(value).toLowerCase();
  return allowed.has(status) ? status : 'research';
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

function normalizeLiveOpportunities(values) {
  const index = opportunityIndex(values);
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
  const opportunities = normalizeLiveOpportunities(payload.values);
  state.opportunities = opportunities;
  state.selectedOpportunity = opportunities[0]?.id ?? null;
  state.liveOpportunities = true;
  state.focusItems = normalizeLiveToday(payload.today);
  state.expandedFocus = state.focusItems[0]?.id ?? '';
  renderRuntimeStatus({ state: 'fresh' });
  renderRuntimeLinks(payload.links);
  renderToday();
  renderOpportunities();
}

async function loadOpportunities() {
  const endpoint = document.documentElement.dataset.hudOpportunitiesEndpoint;
  if (!endpoint) return;
  renderRuntimeStatus({ state: 'loading' });
  try {
    const response = await fetch(endpoint, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (response.status === 204 || response.status === 404 || response.status === 409) {
      renderRuntimeStatus();
      renderRuntimeLinks();
      return;
    }
    if (!response.ok) throw new Error(`Private runtime request failed (${response.status}).`);
    applyOpportunityPayload(await response.json());
  } catch {
    renderRuntimeStatus({ state: 'error' });
    renderRuntimeLinks();
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
      ${expanded ? `<div class="focus-expanded"><p>${escapeHTML(item.expanded)}</p>${state.liveOpportunities ? '<p class="note-prompt">Connected opportunities are read-only in this HUD release.</p>' : `<button class="complete-link" type="button" data-complete-focus="${item.id}">${item.complete ? 'Reopen this sample focus block' : 'Complete this focus block'}</button>`}</div>` : ''}
    </li>`;
  }).join('') : `<li class="empty-state">${state.liveOpportunities ? 'No live follow-ups are currently available from the protected source.' : 'No sample focus blocks match this filter.'}</li>`;

  const addFocus = $('.add-focus');
  addFocus.disabled = state.liveOpportunities;
  addFocus.textContent = state.liveOpportunities ? 'Connected opportunities are read-only' : 'Add a focus block';

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

function renderOpportunities() {
  const addOpportunity = $('[data-open-dialog="opportunity"]');
  addOpportunity.disabled = state.liveOpportunities;
  addOpportunity.title = state.liveOpportunities ? 'Connected opportunities are read-only in this HUD release.' : '';
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
    ${liveDetail ? '<p class="note-prompt">Connected source records are read-only in this HUD release.</p>' : `<div class="detail-section"><h4>Sample activity</h4><ul>${detail.activity.map(activity => `<li>${escapeHTML(activity)}</li>`).join('')}</ul></div><div class="detail-actions"><button class="button button-navy" type="button" data-complete-opportunity-action="${detail.id}">${detail.nextAction.complete ? 'Reopen next step' : 'Complete next step'}</button><button class="button button-quiet" type="button" data-open-dialog="opportunity" data-edit-opportunity="${detail.id}">Edit sample</button></div>`}` : `<div class="empty-state">${state.liveOpportunities ? 'Choose a live opportunity to see its detail.' : 'Choose a sample opportunity to see its detail.'}</div>`;
}

function renderContacts() {
  $('#contacts-list').innerHTML = state.contacts.map(contact => `<article class="contact-card"><p class="eyebrow">${escapeHTML(contact.context)}</p><h3>${escapeHTML(contact.name)}</h3><p>${escapeHTML(contact.detail)}</p><p><strong>${escapeHTML(contact.permission)}</strong></p><button class="text-action" type="button" data-log-contact="${contact.id}">Log sample follow-up</button></article>`).join('');
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
  announce(`${day} selected in the sample week.`);
}

function openDialog(kind, editId = '') {
  if (state.liveOpportunities && ['action', 'opportunity'].includes(kind)) {
    announce('Connected opportunities are read-only in this HUD release.');
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
    if (state.liveOpportunities) { announce('Connected opportunities are read-only in this HUD release.'); return; }
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
    if (state.liveOpportunities) { announce('Connected opportunities are read-only in this HUD release.'); return; }
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

function init() {
  renderToday();
  renderOpportunities();
  renderContacts();
  renderMaterials();
  renderDirection();
  loadOpportunities();
  document.addEventListener('click', handleClick);
  document.addEventListener('change', event => {
    if (event.target.matches('#focus-status')) { state.focusFilter = event.target.value; renderToday(); }
    if (event.target.matches('[data-note-action]')) {
      const action = state.note.actions.find(value => value.id === event.target.dataset.noteAction);
      action.complete = event.target.checked;
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
  setupParallax();
}

init();
