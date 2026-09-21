// Pure server-side renderer for the operator page.
// Golden Rule: never fabricate capability, cost, provider, or status.
// Missing evidence renders UNKNOWN and controls stay disabled.

const ACTIONS = Object.freeze([
  "RUN", "CONTINUE", "PAUSE", "RESUME", "STOP", "RETRY",
  "REASSIGN_MODEL", "ADJUST_BUDGET", "SEND_TO_REVIEW"
]);

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function fmtMoney(micros) {
  return Number.isSafeInteger(micros) ? "$" + (micros / 1_000_000).toFixed(2) : "UNKNOWN";
}

function fmt(value) {
  return value === null || value === undefined || value === "" ? "UNKNOWN" : String(value);
}

function fact(label, value, extraClass = "", extraHtml = "") {
  return '<div class="fact"><div class="label">' + escapeHtml(label) + '</div>' +
    '<div class="value ' + extraClass + '">' + escapeHtml(fmt(value)) + extraHtml + '</div></div>';
}

function statusQualifier(worker) {
  const parts = [];
  if (worker.status === "UNKNOWN" && worker.statusEvidence === "none") {
    parts.push("no runtime evidence");
  }
  if (worker.reportedState === "RUNNING" && worker.status === "UNKNOWN") {
    parts.push("reported RUNNING &middot; stale heartbeat");
  } else if (worker.reportedState && worker.reportedState !== worker.status) {
    parts.push("reported " + escapeHtml(worker.reportedState) + " &middot; stale heartbeat");
  }
  if (worker.status === "NEEDS_REVIEW") {
    parts.push("completion claim unverified");
  }
  return parts.length ? '<div class="qualifier">' + parts.join(" &middot; ") + "</div>" : "";
}

function commandButton(worker, action) {
  const control = worker.controls && worker.controls[action];
  const allowed = control && control.allowed === true;
  const reason = control && control.reason ? String(control.reason) : null;
  const titleAttr = !allowed && reason
    ? ' title="' + escapeHtml(reason) + '"'
    : (action === "REASSIGN_MODEL" ? ' title="Sets the preferred model on the work packet only; Worker 9 and the AI Gateway still qualify and route" ' : "");
  const disabled = allowed ? "" : " disabled";
  let input = "";
  if (action === "REASSIGN_MODEL") {
    input = '<input class="cmd-input" type="text" maxlength="128" placeholder="model id" data-input="model" data-worker="' + escapeHtml(worker.id) + '"' + (allowed ? "" : " disabled") + ">";
  } else if (action === "ADJUST_BUDGET") {
    input = '<input class="cmd-input" type="number" min="0" step="0.01" placeholder="$ limit" data-input="budget" data-worker="' + escapeHtml(worker.id) + '"' + (allowed ? "" : " disabled") + ">";
  }
  let caption = !allowed && reason ? '<div class="reason">' + escapeHtml(reason) + "</div>" : "";
  if (!caption && action === "REASSIGN_MODEL") {
    caption = '<div class="reason">preference only &mdash; Worker 9 + AI Gateway qualify the route</div>';
  }
  return '<div class="cmd">' + input +
    '<button data-worker="' + escapeHtml(worker.id) + '" data-action="' + action + '"' + disabled + titleAttr + ">" + action + "</button>" +
    caption + "</div>";
}

function workerCard(worker) {
  const cost = worker.cost || {};
  const costTruth = cost.truthState === "SUPERVISOR_RECORDED" ? "supervisor-recorded" : "UNKNOWN";
  const reviewFact = fact("Review state", worker.reviewState);
  return '<section class="card">' +
    '<div class="worker-head"><div>' +
      '<div class="worker-id">WORKER ' + escapeHtml(worker.id) + "</div>" +
      "<strong>" + escapeHtml(fmt(worker.name)) + "</strong>" +
    "</div><div>" +
      '<span class="status" data-status="' + escapeHtml(worker.status) + '">' + escapeHtml(worker.status) + "</span>" +
      statusQualifier(worker) +
    "</div></div>" +
    '<div class="facts">' +
      fact("Current task", worker.currentTask) +
      fact("Model", worker.model) +
      fact("Provider", worker.provider) +
      fact("Last heartbeat", worker.lastHeartbeat) +
      fact("Cost consumed", fmtMoney(cost.consumedMicros)) +
      fact("Cost limit", fmtMoney(cost.limitMicros)) +
      fact("Cost remaining", fmtMoney(cost.remainingMicros), "", ' <span class="truth">(' + escapeHtml(costTruth) + ")</span>") +
      fact("Branch", worker.branch) +
      fact("Checkpoint", worker.lastCheckpoint) +
      fact("Latest commit", worker.latestCommit) +
      fact("Blocker", worker.blocker, "blocker") +
      reviewFact +
    "</div>" +
    '<div class="controls">' + ACTIONS.map(a => commandButton(worker, a)).join("") + "</div>" +
  "</section>";
}

const CLIENT_SCRIPT_LINES = [
  "var fmt=v=>v===null||v===undefined||v===''?'UNKNOWN':String(v);",
  "function toast(t){var e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(function(){e.style.display='none'},3200)}",
  "function post(url,body){return fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().catch(function(){return{}}).then(function(d){if(!r.ok){throw new Error(d.error||'Command failed')}return d})})}",
  "function bindCommands(){",
  " var btns=document.querySelectorAll('.controls button:not([disabled])');",
  " btns.forEach(function(b){b.onclick=function(){",
  "  b.disabled=true;", // double-submit guard: re-enabled on error, page reloads on success
  "  var action=b.dataset.action,id=b.dataset.worker,body={action:action};",
  "  if(action==='REASSIGN_MODEL'){var inp=document.querySelector('input[data-input=\"model\"][data-worker=\"'+id+'\"]');if(!inp||!inp.value){b.disabled=false;toast('Model id required');return}body.model=inp.value;}",
  "  if(action==='ADJUST_BUDGET'){var inp2=document.querySelector('input[data-input=\"budget\"][data-worker=\"'+id+'\"]');var dollars=inp2?parseFloat(inp2.value):NaN;if(!isFinite(dollars)||dollars<0){b.disabled=false;toast('Budget in dollars required');return}body.budgetLimitMicros=Math.round(dollars*1000000);}",
  "  post('/operator/api/workers/'+encodeURIComponent(id)+'/command',body).then(function(){toast(action+' request accepted');setTimeout(function(){location.reload()},600)}).catch(function(e){b.disabled=false;toast(e.message)});",
  " };});",
  "}",
  "function bindGlobal(){",
  " var all=document.getElementById('runAll'),phaseBtn=document.getElementById('runPhase'),phase=document.getElementById('phase');",
  " if(all&&!all.disabled){all.onclick=function(){post('/operator/api/global',{action:'RUN_ALL_READY'}).then(function(){toast('Run-all request accepted');setTimeout(function(){location.reload()},600)}).catch(function(e){toast(e.message)})};}",
  " if(phaseBtn){var serverAllowed=!phaseBtn.disabled;",
  "  phaseBtn.disabled=true;",
  "  if(phase){phase.addEventListener('input',function(){phaseBtn.disabled=!(serverAllowed&&phase.value.trim().length>0)});}",
  "  phaseBtn.onclick=function(){if(!phase||!phase.value.trim()){toast('Phase required');return}post('/operator/api/global',{action:'RUN_PHASE',phase:phase.value.trim()}).then(function(){toast('Phase request accepted');setTimeout(function(){location.reload()},600)}).catch(function(e){toast(e.message)})};}",
  "}",
  "bindCommands();bindGlobal();",
  // Do not wipe in-flight operator input: skip the refresh while any field has content.
  "setInterval(function(){if(!document.querySelector('#phase:not(:placeholder-shown), .cmd-input:not(:placeholder-shown)')){location.reload()}},15000);"
];

const CLIENT_SCRIPT = CLIENT_SCRIPT_LINES.join("\n");

export function renderPage(model) {
  const m = model || {};
  const workers = Array.isArray(m.workers) ? m.workers : [];
  const globals = m.globalControls || {};
  const gAll = globals.RUN_ALL_READY || {};
  const gPhase = globals.RUN_PHASE || {};
  const connected = m.connected === true;
  const badge = connected
    ? "ORCHESTRATOR CONNECTED"
    : "DISCONNECTED" + (m.reason ? " &mdash; " + escapeHtml(m.reason) : "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Nexus V2 — Command &amp; Control</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e9eef7;background:#07101c}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#15233b 0,#07101c 52%);padding:calc(18px + env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom))}
main{max-width:1180px;margin:auto}.top{display:flex;justify-content:space-between;align-items:end;gap:14px;margin-bottom:18px}.eyebrow{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:#91a7c9}h1{font-size:clamp(1.35rem,5vw,2.2rem);margin:.25rem 0}.connection{font-size:.78rem;padding:.5rem .65rem;border:1px solid #32496b;border-radius:999px;white-space:nowrap}.connection[data-ok="true"]{border-color:#2f7c5d}.global{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.global input{width:110px;background:#0b1728;color:#fff;border:1px solid #31445f;border-radius:9px;padding:10px;min-height:42px}
button{appearance:none;background:linear-gradient(#203a63,#142844);color:#fff;border:1px solid #456493;border-bottom-width:3px;border-radius:10px;font-weight:700;padding:10px 12px;min-height:42px}button:active:not(:disabled){transform:translateY(1px);border-bottom-width:2px}button:disabled{opacity:.34;cursor:not-allowed}.grid{display:grid;gap:12px}.card{background:rgba(9,21,37,.94);border:1px solid #243a58;border-radius:14px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.2)}.worker-head{display:flex;justify-content:space-between;gap:12px}.worker-id{color:#8fa6c6;font-size:.76rem}.status{font-size:.7rem;font-weight:800;letter-spacing:.05em;padding:5px 7px;border-radius:7px;background:#17263b;white-space:nowrap}.status[data-status="RUNNING"]{background:#143b32}.status[data-status="FAILED"],.status[data-status="BLOCKED"]{background:#4b2027}.status[data-status="READY"]{background:#263d68}.status[data-status="NEEDS_REVIEW"]{background:#4b3a1d}.qualifier{font-size:.64rem;color:#d9b36a;margin-top:4px;max-width:200px}.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}.fact{min-width:0}.label{font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:#7891b2}.value{font-size:.83rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.truth{font-size:.66rem;color:#7891b2}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.cmd{min-width:0}.cmd button{width:100%;font-size:.73rem;padding:8px 5px}.cmd-input{width:100%;margin-bottom:4px;background:#0b1728;color:#fff;border:1px solid #31445f;border-radius:8px;padding:8px;font-size:.75rem}.reason{font-size:.68rem;color:#8fa6c6;margin-top:3px;line-height:1.3;overflow-wrap:anywhere}.controls button{overflow-wrap:anywhere}.cmd-input{min-height:42px}.notice{margin-top:12px;color:#9cb0cb;font-size:.75rem;line-height:1.45}.blocker{color:#ffc8b7;white-space:normal}.toast{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));max-width:520px;margin:auto;padding:12px;border-radius:10px;background:#111f33;border:1px solid #35547e;display:none}
@media(min-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.facts{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1080px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
</style></head>
<body><main>
<div class="top"><div><div class="eyebrow">Private operator surface</div><h1>NEXUS V2</h1></div><div id="connection" class="connection" data-ok="${connected}">${badge}</div></div>
<div class="global">
<div class="gcmd"><button id="runAll"${gAll.allowed === true ? "" : " disabled"}${gAll.allowed !== true && gAll.reason ? ' title="' + escapeHtml(gAll.reason) + '"' : ""}>RUN ALL READY</button>${gAll.allowed !== true && gAll.reason ? '<div class="reason">' + escapeHtml(gAll.reason) + "</div>" : ""}</div>
<input id="phase" placeholder="Phase"><div class="gcmd"><button id="runPhase"${gPhase.allowed === true ? "" : " disabled"}${gPhase.allowed !== true && gPhase.reason ? ' title="' + escapeHtml(gPhase.reason) + '"' : ""}>RUN PHASE</button>${gPhase.allowed !== true && gPhase.reason ? '<div class="reason">' + escapeHtml(gPhase.reason) + "</div>" : ""}</div>
</div>
<div id="grid" class="grid">${workers.map(workerCard).join("")}</div>
<div class="notice">Observed: ${escapeHtml(fmt(m.observedAt))} &middot; Capability source: ${escapeHtml(fmt(m.capabilitySource))}. Controls enable only when derived capability allows; missing or stale evidence is <strong>UNKNOWN</strong>.</div>
</main><div id="toast" class="toast"></div>
<script>
${CLIENT_SCRIPT}
</script></body></html>`;
}
