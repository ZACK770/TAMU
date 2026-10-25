export const CATEGORIES={exam:'מבחן',redemption:'מימוש הטבה',card:'טעינת כרטיס',refund:'החזר',transfer:'העברה',manager:'תיקון מנהל',opening:'יתרת פתיחה (מעבר מימות)',debt:'חוב פתיחה',other:'אחר'};
const rows=async(db,s,...a)=>(await db.prepare(s).bind(...a).all()).results;
export function classifyLegacyLog(r){
 const delta=Number(r.Points)||0,log=String(r.Log||'');
 const category=log.startsWith('Examination')?'exam':/יפה נוף|אור החיים/.test(log)?'card':/העברה/.test(log)?'transfer':delta<0?'redemption':'other';
 return {category,delta,label:category==='exam'?'מבחן':log,where:'ימות '+(r.Folder||''),date:r.Date?r.Date+'T'+(r.Time||'00:00:00'):null};
}
export function classifyLedger(l){
 const p=String(l.reference||'').split(':')[0];
 const category={exam:'exam',order:'redemption',refund:'refund',adjust:'manager',yemot:'opening'}[p]||'other';
 return {category,delta:l.delta,label:l.reason||'',where:category==='exam'?'טלפון':category==='manager'||category==='opening'?'ניהול':'טלפון/ניהול',date:l.createdAt};
}
export async function pointsReport(db,f={}){
 const nid=String(f.nationalId||'').trim(),people=new Map();
 for(const p of await rows(db,'SELECT id,nationalId,name,institution FROM participants'+(nid?' WHERE nationalId=?':''),...(nid?[nid]:[])))people.set(p.nationalId,p);
 const byId=new Map([...people.values()].map(p=>[p.id,p])),out=[];
 const add=(e,nationalId)=>{const p=people.get(nationalId);out.push({...e,nationalId,name:p?.name||'',institution:p?.institution||'',categoryName:CATEGORIES[e.category]})};
 if(f.system!=='new'){
  for(const l of await rows(db,"SELECT nationalId,kind,payload,createdAt FROM legacy WHERE kind IN ('points_log','admin_adjustment','opening_debt')"+(nid?' AND nationalId=?':''),...(nid?[nid]:[]))){
   const r=JSON.parse(l.payload);
   if(l.kind==='points_log')add({system:'ימות',...classifyLegacyLog(r)},l.nationalId);
   else if(l.kind==='admin_adjustment')add({system:'ימות',category:'manager',delta:r.delta,label:'קובץ תיקוני מנהל, שורה '+r.line,where:'ימות add_to_points_total',date:null},l.nationalId);
   else add({system:'ימות',category:'debt',delta:-r.debt,label:'חוב שהועבר מימות (מקוזז מצבירה עתידית)',where:'מעבר',date:l.createdAt},l.nationalId);
  }
 }
 if(f.system!=='legacy'){
  for(const l of await rows(db,'SELECT l.* FROM ledger l'+(nid?' JOIN participants p ON p.id=l.participantId WHERE p.nationalId=?':''),...(nid?[nid]:[]))){
   const p=byId.get(l.participantId);if(p)add({system:'חדש',...classifyLedger(l)},p.nationalId);
  }
 }
 const inst=String(f.institution||'').trim(),text=String(f.search||'').trim();
 const list=out.filter(e=>(!f.category||e.category===f.category)&&(!f.from||(e.date&&e.date>=f.from))&&(!f.to||(e.date&&e.date<=f.to+'T99'))&&(!inst||String(e.institution)===inst)&&(!text||e.label.includes(text)||e.where.includes(text)))
  .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const summary={};for(const e of list){const s=summary[e.category]??={category:e.category,name:CATEGORIES[e.category],count:0,plus:0,minus:0,legacy:0,new:0};s.count++;e.delta>0?s.plus+=e.delta:s.minus+=e.delta;e.system==='ימות'?s.legacy++:s.new++}
 const size=f.all?50000:200,page=Math.max(0,Math.trunc(Number(f.page)||0));
 return {total:list.length,summary:Object.values(summary).sort((a,b)=>b.count-a.count),rows:list.slice(page*size,page*size+size)};
}
