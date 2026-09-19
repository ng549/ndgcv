import { ACTIONS, commandSupported, isSameOriginWrite, normalizeWorker, unknownWorker } from "./core.mjs";

const SEED_WORKERS = [
  { id: "1", name: "Control Tower", branch: "nexus-v2-p1-01-control-tower" },
  { id: "2", name: "Open-Source, MCP & Reuse Scout", branch: "nexus-v2-p1-02-reuse-scout" },
  { id: "7", name: "Integration & Data Connectivity", branch: "nexus-v2-p1-07-integrations" },
  { id: "8", name: "AI Gateway", branch: "nexus-v2-p1-08-ai-gateway" },
  { id: "9", name: "Build Orchestration", branch: null },
  { id: "12", name: "V1 Migration Audit", branch: "nexus-v2-p1-12-old-nexus-audit" },
  { id: "13", name: "Nicolas Command & Control", branch: "nexus-v2-p1-13-operator-command-center" }
];

const enc = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function b64urlToBytes(value) {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function decodePart(value) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(value)));
}

async function verifyAccessJwt(token, env) {
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Error("access_config_or_token_missing");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid_jwt");
  const [h, p, s] = parts;
  const header = decodePart(h);
  const payload = decodePart(p);
  if (header.alg !== "RS256" || !header.kid) throw new Error("unsupported_jwt");

  const team = env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const certResponse = await fetch("https://" + team + "/cdn-cgi/access/certs", { cf: { cacheTtl: 300 } });
  if (!certResponse.ok) throw new Error("cert_fetch_failed");
  const certs = await certResponse.json();
  const jwk = (certs.keys || []).find(k => k.kid === header.kid);
  if (!jwk) throw new Error("kid_not_found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), enc.encode(h + "." + p));
  if (!ok) throw new Error("bad_signature");

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) throw new Error("expired");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new Error("bad_audience");
  if (!payload.email) throw new Error("email_missing");
  return payload;
}

async function authenticate(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || "";
  const claims = await verifyAccessJwt(token, env);
  const email = String(claims.email).toLowerCase();
  const allowed = String(env.OPERATOR_EMAIL || "").toLowerCase();
  if (!allowed || email !== allowed) throw new Error("forbidden_operator");
  if (!env.OPERATOR_RATE_LIMITER) throw new Error("rate_limiter_missing");
  const limited = await env.OPERATOR_RATE_LIMITER.limit({ key: email });
  if (!limited.success) {
    const err = new Error("rate_limited");
    err.status = 429;
    throw err;
  }
  return { email, sub: claims.sub || null };
}

function orchestrationConfigured(env) {
  return Boolean(env.ORCHESTRATOR_BASE_URL && env.ORCHESTRATOR_TOKEN);
}

async function orchestratorFetch(env, path, init = {}) {
  if (!orchestrationConfigured(env)) throw new Error("orchestrator_not_configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(env.ORCHESTRATOR_BASE_URL.replace(/\/$/, "") + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "authorization": "Bearer " + env.ORCHESTRATOR_TOKEN,
        "content-type": "application/json",
        "accept": "application/json",
        ...(init.headers || {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getWorkerState(env) {
  const unknown = SEED_WORKERS.map(w => unknownWorker(w.id, w.name, w.branch));
  if (!orchestrationConfigured(env)) return { connected: false, reason: "ORCHESTRATOR_NOT_CONFIGURED", workers: unknown, globalControls: {} };
  try {
    const res = await orchestratorFetch(env, "/v1/workers");
    if (!res.ok) return { connected: false, reason: "ORCHESTRATOR_HTTP_" + res.status, workers: unknown, globalControls: {} };
    const body = await res.json();
    if (!Array.isArray(body.workers)) return { connected: false, reason: "INVALID_ORCHESTRATOR_PAYLOAD", workers: unknown, globalControls: {} };

    const byId = new Map(body.workers.map(raw => [String(raw.id ?? raw.worker_id), normalizeWorker(raw)]));
    const workers = SEED_WORKERS.map(seed => {
      const live = byId.get(seed.id);
      return live ? { ...live, name: live.name || seed.name, branch: live.branch || seed.branch } : unknownWorker(seed.id, seed.name, seed.branch);
    });
    return {
      connected: true,
      observedAt: body.observed_at || new Date().toISOString(),
      workers,
      globalControls: {
        RUN_ALL_READY: body?.global_controls?.RUN_ALL_READY === true,
        RUN_PHASE: body?.global_controls?.RUN_PHASE === true
      }
    };
  } catch (error) {
    return { connected: false, reason: error.name === "AbortError" ? "ORCHESTRATOR_TIMEOUT" : "ORCHESTRATOR_UNAVAILABLE", workers: unknown, globalControls: {} };
  }
}

async function audit(env, event) {
  if (!env.AUDIT_DB) throw new Error("audit_db_missing");
  const id = crypto.randomUUID();
  await env.AUDIT_DB.prepare(
    "INSERT INTO operator_audit (id, occurred_at, actor_email, action, worker_id, request_id, outcome, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, new Date().toISOString(), event.actor, event.action, event.workerId || null,
    event.requestId, event.outcome, JSON.stringify(event.detail || {})
  ).run();
  console.log(JSON.stringify({ type: "operator_audit", id, ...event }));
  return id;
}

async function commandWorker(request, env, actor, workerId) {
  if (!isSameOriginWrite(request)) return json({ error: "INVALID_WRITE_ORIGIN" }, 403);
  if (!env.AUDIT_DB) return json({ error: "AUDIT_UNAVAILABLE", controls_disabled: true }, 503);

  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();
  if (!ACTIONS.includes(action)) return json({ error: "INVALID_ACTION" }, 400);

  const state = await getWorkerState(env);
  const worker = state.workers.find(w => String(w.id) === String(workerId));
  if (!state.connected || !worker || !commandSupported(worker, action)) {
    await audit(env, { actor: actor.email, action, workerId, requestId, outcome: "DENIED", detail: { reason: "unsupported_or_unverified" } });
    return json({ error: "ACTION_NOT_SUPPORTED_BY_ORCHESTRATOR", status: worker?.status || "UNKNOWN" }, 409);
  }

  await audit(env, { actor: actor.email, action, workerId, requestId, outcome: "REQUESTED", detail: {} });
  const upstream = await orchestratorFetch(env, "/v1/workers/" + encodeURIComponent(workerId) + "/actions", {
    method: "POST",
    headers: { "x-idempotency-key": requestId },
    body: JSON.stringify({ action, requested_by: actor.email, request_id: requestId })
  });
  const payload = await upstream.json().catch(() => ({}));
  await audit(env, {
    actor: actor.email, action, workerId, requestId,
    outcome: upstream.ok ? "ACCEPTED" : "REJECTED",
    detail: { upstream_status: upstream.status, command_id: payload.command_id || null }
  });
  return json({ accepted: upstream.ok, request_id: requestId, command_id: payload.command_id || null }, upstream.ok ? 202 : 502);
}

async function commandGlobal(request, env, actor) {
  if (!isSameOriginWrite(request)) return json({ error: "INVALID_WRITE_ORIGIN" }, 403);
  if (!env.AUDIT_DB) return json({ error: "AUDIT_UNAVAILABLE", controls_disabled: true }, 503);

  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();
  if (!["RUN_ALL_READY", "RUN_PHASE"].includes(action)) return json({ error: "INVALID_GLOBAL_ACTION" }, 400);

  const state = await getWorkerState(env);
  if (!state.connected || state.globalControls[action] !== true) {
    await audit(env, { actor: actor.email, action, requestId, outcome: "DENIED", detail: { reason: "unsupported_or_unverified" } });
    return json({ error: "GLOBAL_ACTION_NOT_SUPPORTED_BY_ORCHESTRATOR" }, 409);
  }
  await audit(env, { actor: actor.email, action, requestId, outcome: "REQUESTED", detail: { phase: body.phase || null } });
  const upstream = await orchestratorFetch(env, "/v1/actions", {
    method: "POST",
    headers: { "x-idempotency-key": requestId },
    body: JSON.stringify({ action, phase: body.phase || null, requested_by: actor.email, request_id: requestId })
  });
  const payload = await upstream.json().catch(() => ({}));
  await audit(env, { actor: actor.email, action, requestId, outcome: upstream.ok ? "ACCEPTED" : "REJECTED", detail: { upstream_status: upstream.status, command_id: payload.command_id || null } });
  return json({ accepted: upstream.ok, request_id: requestId, command_id: payload.command_id || null }, upstream.ok ? 202 : 502);
}

function page() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Nexus V2 — Command & Control</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e9eef7;background:#07101c}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#15233b 0,#07101c 52%);padding:calc(18px + env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom))}
main{max-width:1180px;margin:auto}.top{display:flex;justify-content:space-between;align-items:end;gap:14px;margin-bottom:18px}.eyebrow{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:#91a7c9}h1{font-size:clamp(1.35rem,5vw,2.2rem);margin:.25rem 0}.connection{font-size:.78rem;padding:.5rem .65rem;border:1px solid #32496b;border-radius:999px;white-space:nowrap}.connection[data-ok="true"]{border-color:#2f7c5d}.global{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.global input{width:90px;background:#0b1728;color:#fff;border:1px solid #31445f;border-radius:9px;padding:10px}
button{appearance:none;background:linear-gradient(#203a63,#142844);color:#fff;border:1px solid #456493;border-bottom-width:3px;border-radius:10px;font-weight:700;padding:10px 12px;min-height:42px}button:active:not(:disabled){transform:translateY(1px);border-bottom-width:2px}button:disabled{opacity:.34;cursor:not-allowed}.grid{display:grid;gap:12px}.card{background:rgba(9,21,37,.94);border:1px solid #243a58;border-radius:14px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.2)}.worker-head{display:flex;justify-content:space-between;gap:12px}.worker-id{color:#8fa6c6;font-size:.76rem}.status{font-size:.7rem;font-weight:800;letter-spacing:.05em;padding:5px 7px;border-radius:7px;background:#17263b}.status[data-status="RUNNING"]{background:#143b32}.status[data-status="FAILED"],.status[data-status="BLOCKED"]{background:#4b2027}.status[data-status="READY"]{background:#263d68}.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}.fact{min-width:0}.label{font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:#7891b2}.value{font-size:.83rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.controls button{font-size:.73rem;padding:8px 5px}.notice{margin-top:12px;color:#9cb0cb;font-size:.75rem;line-height:1.45}.blocker{color:#ffc8b7;white-space:normal}.toast{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));max-width:520px;margin:auto;padding:12px;border-radius:10px;background:#111f33;border:1px solid #35547e;display:none}
@media(min-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.facts{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1080px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
</style></head>
<body><main>
<div class="top"><div><div class="eyebrow">Private operator surface</div><h1>NEXUS V2</h1></div><div id="connection" class="connection">Checking worker state…</div></div>
<div class="global"><button id="runAll" disabled>RUN ALL READY</button><input id="phase" placeholder="Phase"><button id="runPhase" disabled>RUN PHASE</button></div>
<div id="grid" class="grid"></div>
<div class="notice">Controls are enabled only when the orchestration service explicitly advertises support. Missing or stale evidence is shown as <strong>UNKNOWN</strong>.</div>
</main><div id="toast" class="toast"></div>
<script>
const actions=["RUN","CONTINUE","PAUSE","RESUME","STOP","RETRY"];
const fmtMoney=m=>Number.isSafeInteger(m)?"$"+(m/1000000).toFixed(2):"UNKNOWN";
const fmt=v=>v===null||v===undefined||v===""?"UNKNOWN":String(v);
const toast=t=>{const el=document.getElementById("toast");el.textContent=t;el.style.display="block";setTimeout(()=>el.style.display="none",3200)};
async function post(url,body){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Command failed");return data}
async function load(){
 const r=await fetch("/operator/api/workers",{headers:{"accept":"application/json"}});
 if(!r.ok){toast("Unable to load worker state");return}
 const state=await r.json(), c=document.getElementById("connection");
 c.dataset.ok=state.connected;c.textContent=state.connected?"ORCHESTRATOR CONNECTED":"ORCHESTRATOR "+fmt(state.reason);
 document.getElementById("runAll").disabled=state.globalControls?.RUN_ALL_READY!==true;
 document.getElementById("runPhase").disabled=state.globalControls?.RUN_PHASE!==true;
 document.getElementById("runAll").onclick=async()=>{try{await post("/operator/api/global",{action:"RUN_ALL_READY"});toast("Run-all request accepted");await load()}catch(e){toast(e.message)}};
 document.getElementById("runPhase").onclick=async()=>{try{await post("/operator/api/global",{action:"RUN_PHASE",phase:document.getElementById("phase").value||null});toast("Phase request accepted");await load()}catch(e){toast(e.message)}};
 document.getElementById("grid").innerHTML=state.workers.map(w=>`
 <section class="card"><div class="worker-head"><div><div class="worker-id">WORKER ${escapeHtml(w.id)}</div><strong>${escapeHtml(w.name)}</strong></div><span class="status" data-status="${escapeHtml(w.status)}">${escapeHtml(w.status)}</span></div>
 <div class="facts">
  ${fact("Current task",w.currentTask)}${fact("Model",w.model)}${fact("Last heartbeat",w.lastHeartbeat)}
  ${fact("Cost",Number.isSafeInteger(w.costMicros)?fmtMoney(w.costMicros):null)}${fact("Branch",w.branch)}
  ${fact("Last checkpoint",w.lastCheckpoint)}${fact("Latest commit",w.latestCommit)}
  ${fact("Budget consumed",Number.isSafeInteger(w.budgetConsumedMicros)?fmtMoney(w.budgetConsumedMicros):null)}
  ${fact("Blocker / decision",w.blocker,"blocker")}
 </div><div class="controls">${actions.map(a=>`<button data-id="${escapeHtml(w.id)}" data-action="${a}" ${w.controls?.[a]===true?"":"disabled"}>${a}</button>`).join("")}</div></section>`).join("");
 document.querySelectorAll(".controls button:not([disabled])").forEach(b=>b.onclick=async()=>{try{await post("/operator/api/workers/"+encodeURIComponent(b.dataset.id)+"/command",{action:b.dataset.action});toast(b.dataset.action+" request accepted");await load()}catch(e){toast(e.message)}});
}
function fact(k,v,cls=""){return `<div class="fact"><div class="label">${escapeHtml(k)}</div><div class="value ${cls}">${escapeHtml(fmt(v))}</div></div>`}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
load();setInterval(load,15000);
</script></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/operator")) return new Response("Not found", { status: 404 });

    let actor;
    try {
      actor = await authenticate(request, env);
    } catch (error) {
      const status = error.status || (error.message === "forbidden_operator" ? 403 : 401);
      return json({ error: "AUTH_REQUIRED", detail: error.message }, status);
    }

    if (request.method === "GET" && (url.pathname === "/operator" || url.pathname === "/operator/")) {
      return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" } });
    }
    if (request.method === "GET" && url.pathname === "/operator/api/workers") return json(await getWorkerState(env));
    if (request.method === "POST" && /^\/operator\/api\/workers\/[^/]+\/command$/.test(url.pathname)) {
      const workerId = decodeURIComponent(url.pathname.split("/")[4]);
      return commandWorker(request, env, actor, workerId);
    }
    if (request.method === "POST" && url.pathname === "/operator/api/global") return commandGlobal(request, env, actor);
    return json({ error: "NOT_FOUND" }, 404);
  }
};
