import {HttpError,validate} from './model.mjs';
import {tabs,columns,headers} from './schema.mjs';
export async function fingerprint(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('')}
export class SheetsStore{
 constructor(workspace,env,fetcher=fetch){this.workspace=workspace;this.env=env;this.fetcher=fetcher;this.mode=workspace.sheetId?'configured':'not connected';this.writeEnabled=env.SHEETS_WRITE_ENABLED==='true';}
 async google(path,options={}){
   const secret=JSON.parse(this.env.GOOGLE_CONNECTIONS_JSON??'{}')[this.workspace.id];
   if(!secret?.refreshToken||!this.workspace.sheetId||!this.env.GOOGLE_CLIENT_ID||!this.env.GOOGLE_CLIENT_SECRET)throw new HttpError(503,'Google Sheets is not connected to the backend yet.');
   if(!this.accessToken){const r=await this.fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:this.env.GOOGLE_CLIENT_ID,client_secret:this.env.GOOGLE_CLIENT_SECRET,refresh_token:secret.refreshToken,grant_type:'refresh_token'})});if(!r.ok)throw new HttpError(503,'Reconnect Google Sheets.');this.accessToken=(await r.json()).access_token;}
   const r=await this.fetcher(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.workspace.sheetId)}${path}`,{...options,headers:{Authorization:`Bearer ${this.accessToken}`,'content-type':'application/json'}});
   if(!r.ok)throw new HttpError(503,'Google Sheets could not complete the request. Refresh before retrying.');return r.json();
 }
 async list(){
   const records=[],ids=new Set();this.locations=new Map();
   for(const [kind,tab]of Object.entries(tabs)){
    const result=await this.google(`/values/${encodeURIComponent(`'${tab}'!A1:Z5001`)}?valueRenderOption=UNFORMATTED_VALUE`);const rows=result.values??[];
    if(JSON.stringify(rows[0])!==JSON.stringify(headers(kind)))throw new HttpError(409,`The ${tab} headers changed. Restore the template headers before syncing.`);
    if(rows.length>=5001)throw new HttpError(409,'Sheet capacity reached. Expand the connector range before adding more records.');
    for(let i=1;i<rows.length;i++){
     const row=rows[i];if(!row.some(v=>String(v).trim()))continue;
     const raw=Object.fromEntries(columns(kind).map((key,index)=>[key,String(row[index]??'')]));
     if(!/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id)||ids.has(raw.id))throw new HttpError(409,`${tab} row ${i+1}: add a unique Record ID.`);ids.add(raw.id);
     for(const key of ['dueDate','appliedDate','lastContact','date'])if(raw[key]&&/^\d+(\.\d+)?$/.test(raw[key]))raw[key]=new Date((Number(raw[key])-25569)*86400000).toISOString().slice(0,10);
     let data;try{data=validate(kind,raw)}catch(e){throw new HttpError(409,`${tab} row ${i+1}: ${e.message}`)}
     const version=await fingerprint(row);records.push({id:raw.id,kind,data,version,createdAt:raw.createdAt,updatedAt:raw.updatedAt});this.locations.set(raw.id,{tab,row:i,version});
    }
   }return records;
 }
 async history(id){const r=await this.google('/values/Activity!A1:F5001');return (r.values??[]).slice(1).filter(row=>row[1]===id).map(row=>({created_at:row[0],summary:row[3],actor:row[2]})).reverse();}
 async save(record,previous,actor){
   if(!this.writeEnabled)throw new HttpError(503,'Dashboard writes are awaiting live sync verification. You can edit the private Sheet directly.');
   const current=(await this.list()).find(r=>r.id===record.id);
   if(previous&&current?.version!==previous.version)throw new HttpError(409,'This record changed in Sheets. Refresh before saving.');if(!previous&&current)throw new HttpError(409,'Record ID already exists.');
   const now=new Date().toISOString(),values=columns(record.kind).map(key=>key==='id'?record.id:key==='createdAt'?(previous?.createdAt||now):key==='updatedAt'?now:record.data[key]);
   const meta=await this.google('?fields=sheets.properties');const sheetId=meta.sheets.find(s=>s.properties.title===tabs[record.kind])?.properties.sheetId;const activityId=meta.sheets.find(s=>s.properties.title==='Activity')?.properties.sheetId;
   if(sheetId===undefined||activityId===undefined)throw new HttpError(409,'Required sheet is missing.');
   const cells=values.map((v,i)=>({userEnteredValue:v&&['dueDate','appliedDate','lastContact','date'].includes(columns(record.kind)[i])?{numberValue:Date.parse(v)/86400000+25569}:{stringValue:v??''}}));
   const mutation=previous?{updateCells:{range:{sheetId,startRowIndex:this.locations.get(record.id).row,endRowIndex:this.locations.get(record.id).row+1,startColumnIndex:0,endColumnIndex:cells.length},rows:[{values:cells}],fields:'userEnteredValue'}}:{appendCells:{sheetId,rows:[{values:cells}],fields:'userEnteredValue'}};
   await this.google(':batchUpdate',{method:'POST',body:JSON.stringify({requests:[mutation,{appendCells:{sheetId:activityId,rows:[{values:[now,record.id,actor,`${previous?'Updated':'Created'} ${record.kind}`,JSON.stringify(previous?.data??{}),JSON.stringify(record.data)].map(v=>({userEnteredValue:{stringValue:v}}))}],fields:'userEnteredValue'}}]})});
   const saved=(await this.list()).find(r=>r.id===record.id);
   if(!saved)throw new HttpError(503,'Save could not be verified. Refresh before retrying.');
   return saved;
 }
}
