import {createRemoteJWKSet, jwtVerify} from 'jose';
import {validate, HttpError} from './model.mjs';
import {SheetsStore} from './sheets.mjs';
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const json=(body,status=200)=>Response.json(body,{status});
export async function authenticate(request,env,keySet){
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.WORKSPACES_JSON)throw new HttpError(503,'Private access has not been configured.');
 const issuer=env.ACCESS_TEAM_DOMAIN.replace(/\/$/,'');
 if(!/^https:\/\/[a-zA-Z0-9-]+\.cloudflareaccess\.com$/.test(issuer))throw new HttpError(503,'Invalid access configuration.');
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)throw new HttpError(401,'Sign in through the private command-center address.');
 let payload;try{({payload}=await jwtVerify(token,keySet??createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)),{issuer,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['exp','sub','email']}));}catch{throw new HttpError(403,'Access denied.');}
 const matches=JSON.parse(env.WORKSPACES_JSON).filter(w=>typeof payload.email==='string'&&w.email.toLowerCase()===payload.email.toLowerCase());
 if(matches.length!==1)throw new HttpError(403,'No private workspace is assigned to this account.');
 return {...matches[0],email:payload.email};
}
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'JSON required.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Body required.');const chunks=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>196608){await reader.cancel();throw new HttpError(413,'Record too large.')}chunks.push(value)}
 const joined=new Uint8Array(size);let offset=0;for(const c of chunks){joined.set(c,offset);offset+=c.length}
 try{return JSON.parse(new TextDecoder().decode(joined))}catch{throw new HttpError(400,'Invalid JSON.')}
}
export async function api(request,workspace,store){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','POST','PUT'].includes(request.method))throw new HttpError(405,'Method not allowed.');
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)throw new HttpError(403,'Same-origin request required.');
 if(path==='/api/session'&&request.method==='GET')return json({name:workspace.name,email:workspace.email,sheetUrl:workspace.sheetId?`https://docs.google.com/spreadsheets/d/${workspace.sheetId}/edit`:null,integrations:{sheets:store.mode,email:false,copilot:false,jobImport:false},writeEnabled:store.writeEnabled});
 if(path==='/api/records'&&request.method==='GET')return json({records:await store.list()});
 const match=path.match(/^\/api\/records\/([a-zA-Z0-9_-]{1,80})(\/history)?$/);
 if(match?.[2]&&request.method==='GET')return json({events:await store.history(match[1])});
 if((path==='/api/records'&&request.method==='POST')||(match&&!match[2]&&request.method==='PUT')){
   const input=await body(request);let previous=null;
   if(match){previous=(await store.list()).find(r=>r.id===match[1]);if(!previous)throw new HttpError(404,'Record not found.');if(input.version!==previous.version)throw new HttpError(409,'This record changed. Refresh before saving; your draft is still here.');}
   const kind=previous?.kind??input.kind,data=validate(kind,input.data);
   if(kind==='message'&&data.opportunityId){const all=await store.list();if(!all.some(r=>r.id===data.opportunityId&&r.kind==='opportunity'))throw new HttpError(400,'Choose an existing opportunity.');}
   return json({record:await store.save({id:previous?.id??crypto.randomUUID(),kind,data},previous,workspace.email)},previous?200:201);
 }
 throw new HttpError(404,'Not found.');
}
export async function handle(request,env,authorize=authenticate,makeStore=(w,e)=>new SheetsStore(w,e)){
 let response;try{const workspace=await authorize(request,env);response=new URL(request.url).pathname.startsWith('/api/')?await api(request,workspace,makeStore(workspace,env)):['GET','HEAD'].includes(request.method)?await env.ASSETS.fetch(request):json({error:'Method not allowed.'},405);}
 catch(error){response=json({error:error instanceof HttpError?error.message:'Unable to complete request. Refresh to check whether your change saved.'},error instanceof HttpError?error.status:500);}
 const secured=new Response(response.body,response);for(const [k,v]of Object.entries(security))secured.headers.set(k,v);return secured;
}
export default {fetch:(request,env)=>handle(request,env)};
