import { ACTIONS, isSameOriginWrite, unknownWorker } from "./core.mjs";

const SEEDS = [
  ["1","Control Tower","nexus-v2-p1-01-control-tower"],
  ["2","Open-Source, MCP & Reuse Scout","nexus-v2-p1-02-reuse-scout"],
  ["7","Integration & Data Connectivity","nexus-v2-p1-07-integrations"],
  ["8","AI Gateway","nexus-v2-p1-08-ai-gateway"],
  ["9","Build Orchestration","nexus-v2-p1-09-build-orchestration"],
  ["12","V1 Migration Audit","nexus-v2-p1-12-old-nexus-audit"],
  ["13","Nicolas Command & Control","nexus-v2-p1-13-operator-command-center"]
];

const enc = new TextEncoder();
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

function b64(value){
  const s=value.replace(/-/g,"+").replace(/_/g,"/");
  const p=s.length%4?"=".repeat(4-s.length%4):"";
  return Uint8Array.from(atob(s+p),c=>c.charCodeAt(0));
}
function decode(value){return JSON.parse(new TextDecoder().decode(b64(value)))}

async function auth(request,env){
  const token=request.headers.get("Cf-Access-Jwt-Assertion")||"";
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.OPERATOR_EMAIL) throw new Error("AUTH_REQUIRED");
  const parts=token.split(".");
  if(parts.length!==3) throw new Error("AUTH_REQUIRED");
  const [h,p,s]=parts, header=decode(h), payload=decode(p);
  const host=env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,"").replace(/\/$/,"");
  const certs=await fetch("https://"+host+"/cdn-cgi/access/certs",{cf:{cacheTtl:300}});
  if(!certs.ok) throw new Error("AUTH_REQUIRED");
  const jwk=(await certs.json()).keys?.find(k=>k.kid===header.kid);
  if(!jwk||header.alg!=="RS256") throw new Error("AUTH_REQUIRED");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64(s),enc.encode(h+"."+p))) throw new Error("AUTH_REQUIRED");
  const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
  if(payload.iss!=="https://"+host||!payload.exp||payload.exp<=Math.floor(Date.now()/1000)||!aud.includes(env.ACCESS_AUD)) throw new Error("AUTH_REQUIRED");
  if(String(payload.email||"").toLowerCase()!==String(env.OPERATOR_EMAIL).toLowerCase()) throw new Error("FORBIDDEN");
  if(!env.OPERATOR_RATE_LIMITER) throw new Error("RATE_LIMIT_UNAVAILABLE");
  if(!(await env.OPERATOR_RATE_LIMITER.limit({key:String(payload.email).toLowerCase()})).success) {
    const e=new Error("RATE_LIMITED"); e.status=429; throw e;
  }
  return String(payload.email).toLowerCase();
}

function controls(state){
  const c=Object.fromEntries(ACTIONS.map(a=>[a,false]));
  if(state==="READY") Object.assign(c,{RUN:true,CONTINUE:true,PAUSE:true,STOP:true});
  else if(state==="RUNNING") Object.assign(c,{PAUSE:true,STOP:true});
  else if(state==="PAUSED") Object.assign(c,{RESUME:true,STOP:true});
  else if(state==="FAILED") Object.assign(c,{RUN:true,CONTINUE:true,PAUSE:true,STOP:true,RETRY:true});
  else if(state==="BLOCKED") c.RETRY=true;\n  else if(state==="STOPPED") Object.assign(c,{RUN:true,CONTINUE:true,RETRY:true});
  return c;
}

function packetToWorker(p){
  const state=String(p.state||"UNKNOWN").toUpperCase();
  return {
    id:String(p.worker_id??"UNKNOWN"),
    name:String(p.module||p.scope||("Worker "+p.worker_id)),
    status:["READY","RUNNING","PAUSED","STOPPED","WAITING_ON_DEPENDENCY","BLOCKED","FAILED","NEEDS_REVIEW","COMPLETE"].includes(state)?state:"UNKNOWN",
    currentTask:p.scope||p.module||null,
    model:p.preferred_model||null,
    lastHeartbeat:p.heartbeat_at||null,
    costMicros:null,
    branch:p.branch||null,
    lastCheckpoint:p.checkpoint_sha||null,
    latestCommit:null,
    budgetConsumedMicros:Number.isSafeInteger(p.budget_consumed_micros)?p.budget_consumed_micros:null,
    blocker:p.blocker ? (typeof p.blocker==="string" ? p.blocker : (p.blocker.message||p.blocker.code||JSON.stringify(p.blocker))) : null,
    controls:controls(state)
  };
}

function configured(env){return Boolean(env.ORCHESTRATOR_BASE_URL&&env.ORCHESTRATOR_TOKEN)}
async function supervisor(env,path,init={}){
  if(!configured(env)) throw new Error("ORCHESTRATOR_NOT_CONFIGURED");
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),5000);
  try{
    return await fetch(env.ORCHESTRATOR_BASE_URL.replace(/\/$/,"")+path,{
      ...init,signal:controller.signal,
      headers:{"authorization":"Bearer "+env.ORCHESTRATOR_TOKEN,"content-type":"application/json","accept":"application/json",...(init.headers||{})}
    });
  } finally {clearTimeout(timer)}
}

async function state(env){
  const fallback=SEEDS.map(([id,name,branch])=>unknownWorker(id,name,branch));
  if(!configured(env)) return {connected:false,reason:"ORCHESTRATOR_NOT_CONFIGURED",workers:fallback,globalControls:{}};
  try{
    const r=await supervisor(env,"/api/workers");
    if(!r.ok) return {connected:false,reason:"ORCHESTRATOR_HTTP_"+r.status,workers:fallback,globalControls:{}};
    const body=await r.json();
    if(!Array.isArray(body.workers)) return {connected:false,reason:"INVALID_ORCHESTRATOR_PAYLOAD",workers:fallback,globalControls:{}};
    const live=new Map(body.workers.map(p=>[String(p.worker_id),packetToWorker(p)]));
    const workers=SEEDS.map(([id,name,branch])=>{
      const w=live.get(id); return w?{...w,name:w.name||name,branch:w.branch||branch}:unknownWorker(id,name,branch);
    });
    return {connected:true,observedAt:new Date().toISOString(),workers,globalControls:{RUN_ALL_READY:true,RUN_PHASE:true}};
  }catch(e){
    return {connected:false,reason:e.name==="AbortError"?"ORCHESTRATOR_TIMEOUT":"ORCHESTRATOR_UNAVAILABLE",workers:fallback,globalControls:{}};
  }
}

async function audit(env,event){
  if(!env.AUDIT_DB) throw new Error("AUDIT_UNAVAILABLE");
  const id=crypto.randomUUID();
  await env.AUDIT_DB.prepare("INSERT INTO operator_audit (id, occurred_at, actor_email, action, worker_id, request_id, outcome, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id,new Date().toISOString(),event.actor,event.action,event.workerId||null,event.requestId,event.outcome,JSON.stringify(event.detail||{})).run();
  console.log(JSON.stringify({type:"operator_audit",id,...event}));
}

async function workerCommand(request,env,actor,workerId){
  if(!isSameOriginWrite(request)) return json({error:"INVALID_WRITE_ORIGIN"},403);
  if(!env.AUDIT_DB) return json({error:"AUDIT_UNAVAILABLE"},503);
  const body=await request.json().catch(()=>({})), action=String(body.action||"").toUpperCase(), requestId=crypto.randomUUID();
  const snapshot=await state(env), worker=snapshot.workers.find(w=>w.id===String(workerId));
  if(!snapshot.connected||!worker||worker.controls?.[action]!==true){
    await audit(env,{actor,action,workerId,requestId,outcome:"DENIED",detail:{reason:"unsupported_or_unverified"}});
    return json({error:"ACTION_NOT_AVAILABLE"},409);
  }
  await audit(env,{actor,action,workerId,requestId,outcome:"REQUESTED"});
  const r=await supervisor(env,"/api/workers/"+encodeURIComponent(workerId)+"/commands",{method:"POST",headers:{"x-idempotency-key":requestId},body:JSON.stringify({command:action,payload:{}})});
  const result=await r.json().catch(()=>({}));
  await audit(env,{actor,action,workerId,requestId,outcome:r.ok?"ACCEPTED":"REJECTED",detail:{upstream_status:r.status}});
  return json({accepted:r.ok,request_id:requestId,result},r.ok?202:502);
}

async function globalCommand(request,env,actor){
  if(!isSameOriginWrite(request)) return json({error:"INVALID_WRITE_ORIGIN"},403);
  if(!env.AUDIT_DB) return json({error:"AUDIT_UNAVAILABLE"},503);
  const body=await request.json().catch(()=>({})), action=String(body.action||"").toUpperCase(), requestId=crypto.randomUUID();
  const snapshot=await state(env);
  if(!snapshot.connected||snapshot.globalControls?.[action]!==true) return json({error:"GLOBAL_ACTION_NOT_AVAILABLE"},409);
  const path=action==="RUN_ALL_READY"?"/api/run-all-ready":"/api/run-phase/"+encodeURIComponent(String(body.phase||""));
  if(action==="RUN_PHASE"&&!body.phase) return json({error:"PHASE_REQUIRED"},400);
  await audit(env,{actor,action,requestId,outcome:"REQUESTED",detail:{phase:body.phase||null}});
  const r=await supervisor(env,path,{method:"POST",headers:{"x-idempotency-key":requestId},body:"{}"});
  const result=await r.json().catch(()=>({}));
  await audit(env,{actor,action,requestId,outcome:r.ok?"ACCEPTED":"REJECTED",detail:{upstream_status:r.status}});
  return json({accepted:r.ok,request_id:requestId,result},r.ok?202:502);
}

function html(){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Nexus V2</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;background:#07101c;color:#eef4ff;padding:20px}main{max-width:1180px;margin:auto}header{display:flex;justify-content:space-between;gap:12px;align-items:end}.muted{color:#8ea5c5;font-size:12px}.globals,.controls{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}button,input{border:1px solid #415f89;border-radius:9px;padding:10px;background:#142844;color:#fff}button:disabled{opacity:.35}.grid{display:grid;gap:12px}.card{border:1px solid #263d5d;border-radius:14px;padding:14px;background:#0b1728}.top{display:flex;justify-content:space-between;gap:8px}.status{font-size:11px;padding:5px 7px;border-radius:7px;background:#1d304b}.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.k{font-size:10px;color:#7890b0;text-transform:uppercase}.v{font-size:13px;overflow:hidden;text-overflow:ellipsis}.controls button{font-size:11px}.toast{position:fixed;bottom:20px;left:20px;right:20px;max-width:520px;margin:auto;background:#12233a;border:1px solid #36577f;border-radius:9px;padding:12px;display:none}@media(min-width:780px){.grid{grid-template-columns:1fr 1fr}}@media(min-width:1100px){.grid{grid-template-columns:1fr 1fr 1fr}}</style></head>
<body><main><header><div><div class="muted">PRIVATE OPERATOR SURFACE</div><h1>NEXUS V2</h1></div><div id="conn" class="muted">CHECKING</div></header>
<div class="globals"><button id="all" disabled>RUN ALL READY</button><input id="phase" placeholder="Phase"><button id="phaseRun" disabled>RUN PHASE</button></div>
<div id="grid" class="grid"></div><p class="muted">Runtime evidence comes from Worker 9. Missing evidence is UNKNOWN and controls stay disabled.</p></main><div id="toast" class="toast"></div>
<script>
const acts=["RUN","CONTINUE","PAUSE","RESUME","STOP","RETRY"], fmt=v=>v===null||v===undefined||v===""?"UNKNOWN":String(v), esc=v=>fmt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])), money=m=>Number.isSafeInteger(m)?"$"+(m/1e6).toFixed(2):"UNKNOWN";
function note(t){const e=document.getElementById("toast");e.textContent=t;e.style.display="block";setTimeout(()=>e.style.display="none",2500)}
async function post(u,b){const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Command failed");return d}
function fact(k,v){return '<div><div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div></div>'}
async function load(){const r=await fetch("/operator/api/workers"),s=await r.json();const c=document.getElementById("conn");c.textContent=s.connected?"ORCHESTRATOR CONNECTED":"ORCHESTRATOR "+fmt(s.reason);document.getElementById("all").disabled=s.globalControls?.RUN_ALL_READY!==true;document.getElementById("phaseRun").disabled=s.globalControls?.RUN_PHASE!==true;
document.getElementById("grid").innerHTML=s.workers.map(w=>'<section class="card"><div class="top"><div><div class="muted">WORKER '+esc(w.id)+'</div><strong>'+esc(w.name)+'</strong></div><span class="status">'+esc(w.status)+'</span></div><div class="facts">'+fact("Current task",w.currentTask)+fact("Model",w.model)+fact("Last heartbeat",w.lastHeartbeat)+fact("Cost",Number.isSafeInteger(w.costMicros)?money(w.costMicros):null)+fact("Branch",w.branch)+fact("Checkpoint",w.lastCheckpoint)+fact("Latest commit",w.latestCommit)+fact("Budget consumed",Number.isSafeInteger(w.budgetConsumedMicros)?money(w.budgetConsumedMicros):null)+fact("Blocker / decision",w.blocker)+'</div><div class="controls">'+acts.map(a=>'<button data-id="'+esc(w.id)+'" data-a="'+a+'" '+(w.controls?.[a]===true?'':'disabled')+'>'+a+'</button>').join("")+'</div></section>').join("");
document.querySelectorAll(".controls button:not([disabled])").forEach(b=>b.onclick=async()=>{try{await post("/operator/api/workers/"+encodeURIComponent(b.dataset.id)+"/command",{action:b.dataset.a});note(b.dataset.a+" accepted");load()}catch(e){note(e.message)}})}
document.getElementById("all").onclick=async()=>{try{await post("/operator/api/global",{action:"RUN_ALL_READY"});note("Run-all accepted");load()}catch(e){note(e.message)}};
document.getElementById("phaseRun").onclick=async()=>{try{await post("/operator/api/global",{action:"RUN_PHASE",phase:document.getElementById("phase").value});note("Phase accepted");load()}catch(e){note(e.message)}};
load();setInterval(load,15000);
</script></body></html>`;
}

export default {async fetch(request,env){
  const url=new URL(request.url); if(!url.pathname.startsWith("/operator")) return new Response("Not found",{status:404});
  let actor; try{actor=await auth(request,env)}catch(e){return json({error:e.message},e.status|| (e.message==="FORBIDDEN"?403:401))}
  if(request.method==="GET"&&(url.pathname==="/operator"||url.pathname==="/operator/")) return new Response(html(),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-frame-options":"DENY","referrer-policy":"no-referrer","x-content-type-options":"nosniff","content-security-policy":"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}});
  if(request.method==="GET"&&url.pathname==="/operator/api/workers") return json(await state(env));
  const m=url.pathname.match(/^\/operator\/api\/workers\/([^/]+)\/command$/); if(request.method==="POST"&&m) return workerCommand(request,env,actor,decodeURIComponent(m[1]));
  if(request.method==="POST"&&url.pathname==="/operator/api/global") return globalCommand(request,env,actor);
  return json({error:"NOT_FOUND"},404);
}};
