export const stages = ['Saved','Researching','Preparing','Applied / Introduced','Interviewing','Offer','Accepted','On hold','Declined','Rejected','Closed'];
export const inactive = ['Accepted','On hold','Declined','Rejected','Closed'];
export const fields = {
  opportunity: ['company','title','type','stage','url','description','location','compensation','source','contact','appliedDate','applicationMethod','nextAction','dueDate','waitingOn','fit','notes','documents','interviews','references','offer'],
  contact: ['name','company','role','email','phone','url','relationship','canSpeakTo','sharingPreferences','lastContact','nextAction','dueDate','notes'],
  message: ['opportunityId','contact','subject','direction','date','body','analysis','nextAction','dueDate','status']
};
export class HttpError extends Error { constructor(status,message){ super(message); this.status=status; } }
export function validate(kind, input) {
  if (!fields[kind] || !input || typeof input!=='object' || Array.isArray(input)) throw new HttpError(400,'Invalid record.');
  const result={};
  for(const key of fields[kind]) {
    const value=input[key]??'';
    if(typeof value!=='string' || value.length>12000) throw new HttpError(400,`Invalid ${key}.`);
    result[key]=value.trim();
  }
  for(const key of kind==='opportunity'?['company','title']:kind==='contact'?['name']:['subject']) if(!result[key]) throw new HttpError(400,`${key} is required.`);
  if(kind==='message' && (!['Received','Draft','Sent externally'].includes(result.direction)||!['Needs review','Reviewed','Archived'].includes(result.status))) throw new HttpError(400,'Invalid correspondence status.');
  if(kind==='opportunity') {
    if(!stages.includes(result.stage)) throw new HttpError(400,'Choose a valid stage.');
    if(!['Employment','Consulting','Consulting → leadership'].includes(result.type)) throw new HttpError(400,'Choose an opportunity type.');
  }
  for(const key of ['dueDate','appliedDate','lastContact','date']) if(result[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(result[key]) || !Number.isFinite(Date.parse(result[key])) || new Date(result[key]).toISOString().slice(0,10)!==result[key])) throw new HttpError(400,`Invalid ${key}.`);
  if(result.url){ let url; try {url=new URL(result.url)} catch {throw new HttpError(400,'Enter a full https:// link.')} if(!['https:','http:'].includes(url.protocol)||url.username||url.password) throw new HttpError(400,'Only ordinary web links are allowed.'); }
  if(result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new HttpError(400,'Enter a valid email.');
  return result;
}
export function attention(records,today) {
  const active=records.filter(r=>r.kind==='contact'||(r.kind==='message'?r.data.status!=='Archived':!inactive.includes(r.data.stage)));
  return { overdue:active.filter(r=>r.data.nextAction&&r.data.dueDate&&r.data.dueDate<today), today:active.filter(r=>r.data.nextAction&&r.data.dueDate===today), waiting:active.filter(r=>r.data.waitingOn), unscheduled:active.filter(r=>!r.data.nextAction||!r.data.dueDate) };
}
