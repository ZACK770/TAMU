import * as D from './domain.mjs';
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const rows=async(db,s,...a)=>(await q(db,s,...a).all()).results;
const first=(db,s,...a)=>q(db,s,...a).first();
const fail=(m,s=400)=>{throw new D.DomainError(m,s)};
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
const day=(v,def)=>{const s=String(v||def||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail('תאריך לא תקין');return s};
const txt=(v,n=120)=>String(v||'').trim().slice(0,n);
const count=(v,max=5000)=>{const n=Number(v||0);if(!Number.isInteger(n)||n<0||n>max)fail('מספר לא תקין: '+v);return n};
const normCode=v=>String(v||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
const endOf=d=>d+'T23:59:59.999Z';
const DAY=864e5;
export const DEFAULT_GOALS=Object.freeze({learners:100,tefillin:300,handed:200,returning:30});
const monthRange=m=>{m=String(m||today().slice(0,7));if(!/^\d{4}-\d{2}$/.test(m))fail('חודש לא תקין');const [y,mo]=m.split('-').map(Number),last=new Date(Date.UTC(y,mo,0)).getUTCDate();return {month:m,from:m+'-01',to:m+'-'+String(last).padStart(2,'0')}};

export async function listStands(db){
 return {
  stands:await rows(db,'SELECT s.*,(SELECT COUNT(*) FROM b_booklet_codes c WHERE c.standId=s.id AND c.voided=0) AS codes,(SELECT COUNT(*) FROM b_booklet_codes c WHERE c.standId=s.id AND c.participantId IS NOT NULL) AS used FROM b_stands s ORDER BY s.active DESC,s.name'),
  distributions:await rows(db,'SELECT d.*,b.title AS booklet,a.name AS operator FROM b_distributions d LEFT JOIN b_booklets b ON b.id=d.bookletId LEFT JOIN staff_accounts a ON a.id=d.operatorId ORDER BY d.createdAt DESC'),
  operators:await rows(db,"SELECT id,name,username,scope,active FROM staff_accounts WHERE role='operator' ORDER BY name"),
  booklets:await rows(db,'SELECT b.id,b.title,(SELECT MAX(c.serial) FROM b_booklet_codes c WHERE c.bookletId=b.id) AS lastSerial FROM b_booklets b ORDER BY b.createdAt DESC')
 };
}
export async function saveStand(db,b,actor){
 const name=txt(b.name);if(!name)fail('חסר שם לדוכן');const city=txt(b.city,80),location=txt(b.location,200),active=b.active===false||b.active==='0'?0:1;
 if(b.id){if(!await first(db,'SELECT id FROM b_stands WHERE id=?',b.id))fail('הדוכן לא נמצא',404);
  await db.batch([q(db,'UPDATE b_stands SET name=?,city=?,location=?,active=? WHERE id=?',name,city,location,active,b.id),D.auditStatement(db,actor,'stand.save',b.id,{name})]);return {id:b.id}}
 const id=crypto.randomUUID();await db.batch([q(db,'INSERT INTO b_stands(id,name,city,location,active,createdAt) VALUES(?,?,?,?,?,?)',id,name,city,location,active,D.now()),D.auditStatement(db,actor,'stand.create',id,{name})]);return {id};
}
export async function assignCodes(db,b,actor){
 const bk=await first(db,'SELECT id FROM b_booklets WHERE id=?',b.bookletId);if(!bk)fail('החוברת לא נמצאה',404);
 const st=await first(db,'SELECT id FROM b_stands WHERE id=?',b.standId);if(!st)fail('הדוכן לא נמצא',404);
 const from=Number(b.from),to=Number(b.to);if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from)fail('טווח העותקים לא תקין');if(to-from>=5000)fail('אפשר לשייך עד 5000 עותקים בכל פעם');
 const op=b.operatorId||null;if(op&&!await first(db,"SELECT id FROM staff_accounts WHERE id=? AND role='operator'",op))fail('המפעיל לא נמצא');
 const startsAt=b.startsAt?day(b.startsAt):null,endsAt=b.endsAt?day(b.endsAt):null;if(startsAt&&endsAt&&endsAt<startsAt)fail('תאריך הסיום לפני תאריך ההתחלה');
 const n=Number((await first(db,'SELECT COUNT(*) AS n FROM b_booklet_codes WHERE bookletId=? AND serial>=? AND serial<=? AND voided=0',b.bookletId,from,to)).n);
 if(!n)fail('אין קודים בטווח הזה. יוצרים קודים במסך החוברת קודם.');
 const clash=await first(db,'SELECT COUNT(*) AS n FROM b_booklet_codes WHERE bookletId=? AND serial>=? AND serial<=? AND participantId IS NOT NULL AND standId IS NOT NULL AND standId<>?',b.bookletId,from,to,b.standId);
 if(Number(clash.n))fail('בטווח יש '+clash.n+' עותקים שכבר נוצלו ושייכים לדוכן אחר. בוחרים טווח אחר.');
 const id=crypto.randomUUID();
 await db.batch([q(db,'UPDATE b_booklet_codes SET standId=? WHERE bookletId=? AND serial>=? AND serial<=? AND voided=0',b.standId,b.bookletId,from,to),
  q(db,'INSERT INTO b_distributions(id,bookletId,standId,operatorId,fromSerial,toSerial,startsAt,endsAt,createdAt) VALUES(?,?,?,?,?,?,?,?,?)',id,b.bookletId,b.standId,op,from,to,startsAt,endsAt,D.now()),
  D.auditStatement(db,actor,'stand.assign',b.standId,{bookletId:b.bookletId,from,to})]);
 return {id,count:n};
}
async function myStand(db,staff){const id=staff.scope?.stand;const s=id&&await first(db,'SELECT * FROM b_stands WHERE id=?',id);if(!s)fail('לא שויך אליך דוכן. פנו למנהל.',403);return s}
export async function operatorHome(db,staff){
 const s=await myStand(db,staff),t=today();
 const booklets=await rows(db,'SELECT b.id,b.title,(SELECT COUNT(*) FROM b_booklet_codes c WHERE c.bookletId=b.id AND c.standId=? AND c.voided=0) AS assigned,(SELECT COUNT(*) FROM b_booklet_codes c WHERE c.bookletId=b.id AND c.standId=? AND c.participantId IS NOT NULL) AS entered,(SELECT COALESCE(SUM(r.handed),0) FROM b_stand_reports r WHERE r.bookletId=b.id AND r.standId=?) AS handed,(SELECT r.handed FROM b_stand_reports r WHERE r.bookletId=b.id AND r.standId=? AND r.reportDate=?) AS handedToday FROM b_booklets b WHERE b.id IN (SELECT bookletId FROM b_distributions WHERE standId=?) ORDER BY b.createdAt DESC',s.id,s.id,s.id,s.id,t,s.id);
 const d=await first(db,'SELECT tefillin,notes FROM b_stand_days WHERE standId=? AND reportDate=?',s.id,t);
 const marked=await first(db,'SELECT COUNT(*) AS n FROM b_tefillin_marks WHERE standId=? AND markDate=?',s.id,t);
 return {stand:{id:s.id,name:s.name,city:s.city,location:s.location},date:t,booklets,day:{tefillin:d?.tefillin??null,notes:d?.notes||''},markedToday:Number(marked.n)};
}
export async function standReport(db,staff,b){
 const s=await myStand(db,staff),t=today(),date=day(b.date,t);
 if(date>t||Date.parse(t)-Date.parse(date)>14*DAY)fail('אפשר לדווח על היום ועל 14 הימים האחרונים');
 const allowed=new Set((await rows(db,'SELECT DISTINCT bookletId FROM b_distributions WHERE standId=?',s.id)).map(r=>r.bookletId)),st=[];
 for(const [bid,v] of Object.entries(b.handed||{})){if(v===''||v==null)continue;if(!allowed.has(bid))fail('החוברת לא שויכה לדוכן שלך');
  st.push(q(db,'INSERT INTO b_stand_reports(id,standId,bookletId,reportDate,handed,operatorId,createdAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(standId,bookletId,reportDate) DO UPDATE SET handed=excluded.handed,operatorId=excluded.operatorId',crypto.randomUUID(),s.id,bid,date,count(v),staff.id,D.now()))}
 if(b.tefillin!==undefined&&b.tefillin!==''||b.notes)st.push(q(db,'INSERT INTO b_stand_days(id,standId,reportDate,tefillin,notes,operatorId,createdAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(standId,reportDate) DO UPDATE SET tefillin=excluded.tefillin,notes=excluded.notes,operatorId=excluded.operatorId',crypto.randomUUID(),s.id,date,count(b.tefillin||0),txt(b.notes,1000),staff.id,D.now()));
 if(!st.length)fail('לא הוזן שום מספר');
 st.push(D.auditStatement(db,staff.id,'stand.report',s.id,{date}));await db.batch(st);return {ok:true};
}
export async function markTefillin(db,staff,b){
 const s=await myStand(db,staff),code=normCode(b.code),c=code&&await first(db,'SELECT c.code,c.voided,b.title FROM b_booklet_codes c JOIN b_booklets b ON b.id=c.bookletId WHERE c.code=?',code);
 if(!c||c.voided)fail('הקוד לא נמצא. בודקים את הקוד שבגב החוברת.',404);
 try{await q(db,'INSERT INTO b_tefillin_marks(id,code,standId,operatorId,markDate,createdAt) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),code,s.id,staff.id,today(),D.now()).run()}
 catch(e){if(/unique|duplicate/i.test(e.message))fail('הקוד הזה כבר סומן היום',409);throw e}
 return {ok:true,booklet:c.title};
}
async function byIds(db,sql,ids){const out=[];for(let i=0;i<ids.length;i+=500){const p=ids.slice(i,i+500);if(p.length)out.push(...await rows(db,sql.replace('(?)','('+p.map(()=>'?').join(',')+')'),...p))}return out}
export async function funnel(db,b={}){
 const m=monthRange(b.month),from=day(b.from,m.from),to=day(b.to,m.to),key=(s,k)=>s+'|'+k,map=new Map();
 const names={stand:Object.fromEntries((await rows(db,'SELECT id,name FROM b_stands')).map(r=>[r.id,r.name])),booklet:Object.fromEntries((await rows(db,'SELECT id,title FROM b_booklets')).map(r=>[r.id,r.title]))};
 const row=(s,k)=>{const x=key(s,k);if(!map.has(x))map.set(x,{standId:s,stand:names.stand[s]||'',bookletId:k,booklet:names.booklet[k]||'',assigned:0,handed:0,entered:0,completed:0,returned:0,deepened:0});return map.get(x)};
 for(const r of await rows(db,'SELECT standId,bookletId,COUNT(*) AS n FROM b_booklet_codes WHERE standId IS NOT NULL AND voided=0 GROUP BY standId,bookletId'))row(r.standId,r.bookletId).assigned=Number(r.n);
 for(const r of await rows(db,'SELECT standId,bookletId,SUM(handed) AS n FROM b_stand_reports WHERE reportDate>=? AND reportDate<=? GROUP BY standId,bookletId',from,to))row(r.standId,r.bookletId).handed=Number(r.n);
 const used=await rows(db,'SELECT c.standId,c.bookletId,c.participantId,c.usedAt,b.examId FROM b_booklet_codes c JOIN b_booklets b ON b.id=c.bookletId WHERE c.standId IS NOT NULL AND c.participantId IS NOT NULL AND c.usedAt>=? AND c.usedAt<=?',from,endOf(to));
 const pids=[...new Set(used.map(u=>u.participantId))];
 const atts=await byIds(db,'SELECT participantId,examId,completed,createdAt FROM b_attempts WHERE participantId IN (?)',pids);
 const evs=new Set((await byIds(db,"SELECT participantId,bookletId FROM b_events WHERE kind='next' AND participantId IN (?)",pids)).map(e=>e.participantId+'|'+e.bookletId));
 for(const u of used){const r=row(u.standId,u.bookletId),mine=atts.filter(a=>a.participantId===u.participantId),t0=Date.parse(u.usedAt);r.entered++;
  if(mine.some(a=>a.examId===u.examId&&a.completed))r.completed++;
  if(mine.some(a=>a.examId!==u.examId&&Date.parse(a.createdAt)>t0&&Date.parse(a.createdAt)-t0<=30*DAY))r.returned++;
  if(evs.has(u.participantId+'|'+u.bookletId))r.deepened++}
 const tef=Object.fromEntries((await rows(db,'SELECT standId,SUM(tefillin) AS n FROM b_stand_days WHERE reportDate>=? AND reportDate<=? GROUP BY standId',from,to)).map(r=>[r.standId,Number(r.n)]));
 const mk=Object.fromEntries((await rows(db,'SELECT standId,COUNT(*) AS n FROM b_tefillin_marks WHERE markDate>=? AND markDate<=? GROUP BY standId',from,to)).map(r=>[r.standId,Number(r.n)]));
 const ok=r=>(!b.standId||r.standId===b.standId)&&(!b.bookletId||r.bookletId===b.bookletId);
 return {from,to,rows:[...map.values()].filter(ok).sort((x,y)=>x.stand.localeCompare(y.stand)||x.booklet.localeCompare(y.booklet)),
  stands:Object.keys(names.stand).filter(id=>!b.standId||id===b.standId).map(id=>({standId:id,stand:names.stand[id],tefillin:tef[id]||0,marked:mk[id]||0}))};
}
export async function goals(db,b={}){
 const {month,from,to}=monthRange(b.month),prev=monthRange(new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7)-2,1)).toISOString().slice(0,7));
 const s=await first(db,'SELECT value FROM settings WHERE key=?','bifnimGoals'),targets={...DEFAULT_GOALS,...(s?JSON.parse(s.value):{})};
 const learnersIn=async r=>new Set((await rows(db,'SELECT DISTINCT participantId FROM b_attempts WHERE completed=1 AND completedAt>=? AND completedAt<=?',r.from,endOf(r.to))).map(x=>x.participantId));
 const cur=await learnersIn({from,to}),old=await learnersIn(prev);
 const sum=async(sql)=>Number((await first(db,sql,from,to))?.n||0);
 return {month,targets,actual:{learners:cur.size,returning:[...cur].filter(p=>old.has(p)).length,
  tefillin:await sum('SELECT COALESCE(SUM(tefillin),0) AS n FROM b_stand_days WHERE reportDate>=? AND reportDate<=?'),
  marked:await sum('SELECT COUNT(*) AS n FROM b_tefillin_marks WHERE markDate>=? AND markDate<=?'),
  handed:await sum('SELECT COALESCE(SUM(handed),0) AS n FROM b_stand_reports WHERE reportDate>=? AND reportDate<=?'),
  entered:Number((await first(db,'SELECT COUNT(*) AS n FROM b_booklet_codes WHERE participantId IS NOT NULL AND usedAt>=? AND usedAt<=?',from,endOf(to))).n)}};
}
export async function saveGoals(db,b,actor){
 const t={};for(const k of Object.keys(DEFAULT_GOALS))t[k]=count(b.targets?.[k]??DEFAULT_GOALS[k],1e6);
 await db.batch([q(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','bifnimGoals',JSON.stringify(t)),D.auditStatement(db,actor,'goals.save','bifnimGoals',t)]);return {targets:t};
}
export async function nextClick(raw,pid,bookletId){
 if(!await first(raw,'SELECT id FROM b_booklets WHERE id=?',bookletId))fail('החוברת לא נמצאה',404);
 if(!await first(raw,"SELECT id FROM b_events WHERE participantId=? AND bookletId=? AND kind='next'",pid,bookletId))await q(raw,'INSERT INTO b_events(id,participantId,bookletId,kind,createdAt) VALUES(?,?,?,?,?)',crypto.randomUUID(),pid,bookletId,'next',D.now()).run();
 return {ok:true};
}
