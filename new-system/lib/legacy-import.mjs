import {hashPassword,digest,now} from './domain.mjs';

const lines=text=>String(text).replace(/^\uFEFF/,'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
const validId=s=>/^\d{9}$/.test(s);

export function parseListAllInformation(text,passwordIndex=6){
 return lines(text).map((l,i)=>{const c=l.split(',').map(s=>s.trim());return {line:i+1,nationalId:c[0]||'',first:c[2]||'',last:c[3]||'',school:c[5]||'',password:c[passwordIndex]||'',raw:c}}).filter(r=>r.nationalId);
}

export function parsePointsIni(text){
 const out=new Map();
 for(const l of lines(text)){
  const eq=l.lastIndexOf('=');if(eq<0)continue;
  const key=l.slice(0,eq),value=Number(l.slice(eq+1));const m=key.match(/^[^-]+-([^-]+)-(.+)$/);
  if(!m||!Number.isSafeInteger(value))continue;
  const e=out.get(m[1])||{total:null,folders:{}};
  if(m[2]==='points_total')e.total=value;else e.folders[m[2]]=value;
  out.set(m[1],e);
 }
 return out;
}

export function parseAddFile(text){
 return lines(text).map((l,i)=>{const [nationalId,delta]=l.split(',').map(s=>s.trim());return {line:i+1,nationalId,delta:Number(delta)}}).filter(r=>r.nationalId&&Number.isSafeInteger(r.delta));
}

export function parseYmgr(text){
 return lines(text).map(l=>Object.fromEntries(l.split('%').filter(p=>p.includes('#')).map(p=>{const i=p.indexOf('#');return [p.slice(0,i),p.slice(i+1)]})));
}

export function buildPlan({list='',points='',adds='',logs={}}){
 const people=new Map(),review=[],legacy=[];
 const person=nid=>{if(!people.has(nid))people.set(nid,{nationalId:nid,names:new Set(),schools:new Set(),passwords:new Set(),earned:0,adjust:0,lastLogTotal:null,logName:''});return people.get(nid)};
 const flag=(nid,issue,details={})=>review.push({nationalId:nid,issue,...details});
 for(const r of parseListAllInformation(list)){
  if(!validId(r.nationalId)){flag(r.nationalId,'invalid_id',{source:'list',line:r.line});continue}
  const p=person(r.nationalId);const name=`${r.first} ${r.last}`.trim();
  if(name)p.names.add(name);if(r.school)p.schools.add(r.school);if(/^\d{1,12}$/.test(r.password))p.passwords.add(r.password);
 }
 for(const [nid,e] of parsePointsIni(points)){
  if(!validId(nid)){flag(nid,'invalid_id',{source:'points',total:e.total});continue}
  const p=person(nid);p.earned=e.total||0;
  if(Object.keys(e.folders).length)legacy.push({rowKey:`folders:${nid}`,nationalId:nid,kind:'folder_points',payload:e.folders});
 }
 const seen=new Map();
 for(const a of parseAddFile(adds)){
  const n=(seen.get(a.nationalId+','+a.delta)||0)+1;seen.set(a.nationalId+','+a.delta,n);
  if(!validId(a.nationalId)){flag(a.nationalId,'invalid_id',{source:'adds',delta:a.delta});continue}
  person(a.nationalId).adjust+=a.delta;
  legacy.push({rowKey:`add:${a.nationalId}:${a.delta}:${n}`,nationalId:a.nationalId,kind:'admin_adjustment',payload:{delta:a.delta,line:a.line}});
 }
 for(const file of Object.keys(logs).sort()){
  parseYmgr(logs[file]).forEach((r,i)=>{
   const nid=r.id||r.EnterId||'';
   legacy.push({rowKey:`log:${file}:${i+1}`,nationalId:nid,kind:'points_log',payload:r});
   if(validId(nid)){const p=person(nid);if(/^-?\d+$/.test(r.PointsTotal||''))p.lastLogTotal=Number(r.PointsTotal);if(r.ValName)p.logName=r.ValName}
  });
 }
 const participants=[];
 for(const p of people.values()){
  const balance=p.earned+p.adjust;
  const names=[...p.names],name=names[0]||p.logName||'ללא שם';
  if(!p.passwords.size)flag(p.nationalId,'no_password',{name});
  if(names.length>1)flag(p.nationalId,'duplicate_rows',{names:names.join(' | '),passwords:p.passwords.size});
  if(balance<0)flag(p.nationalId,'negative_balance',{name,earned:p.earned,adjust:p.adjust,balance});
  if(p.lastLogTotal!==null&&p.lastLogTotal!==p.earned)flag(p.nationalId,'log_mismatch',{name,earned:p.earned,lastLogTotal:p.lastLogTotal});
  participants.push({nationalId:p.nationalId,name,institution:[...p.schools].join(',')||null,passwords:[...p.passwords],earned:p.earned,adjust:p.adjust,balance,opening:Math.max(balance,0)});
 }
 const summary={participants:participants.length,withPassword:participants.filter(p=>p.passwords.length).length,totalOpening:participants.reduce((s,p)=>s+p.opening,0),legacyRows:legacy.length,review:review.reduce((m,r)=>(m[r.issue]=(m[r.issue]||0)+1,m),{})};
 return {participants,review,legacy,summary};
}

const chunk=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n));
async function insertMany(db,table,cols,values){
 if(!values.length)return;
 const q=`INSERT OR IGNORE INTO ${table}(${cols.join(',')}) VALUES ${values.map(()=>'('+cols.map(()=>'?').join(',')+')').join(',')}`;
 await db.prepare(q).bind(...values.flat()).run();
}

export async function applyPlan(db,plan,{actor='import:yemot',progress=()=>{}}={}){
 const at=now();let done=0;
 for(const part of chunk(plan.participants,100)){
  await insertMany(db,'participants',['id','nationalId','name','institution','createdAt'],part.map(p=>['yemot-'+p.nationalId,p.nationalId,p.name,p.institution,at]));
  const ids=new Map((await db.prepare(`SELECT id,nationalId FROM participants WHERE nationalId IN (${part.map(()=>'?').join(',')})`).bind(...part.map(p=>p.nationalId)).all()).results.map(r=>[r.nationalId,r.id]));
  const have=new Set((await db.prepare(`SELECT rowKey FROM legacy WHERE kind='password' AND nationalId IN (${part.map(()=>'?').join(',')})`).bind(...part.map(p=>p.nationalId)).all()).results.map(r=>r.rowKey));
  const pw=[];
  for(const p of part)for(const [i,pass] of p.passwords.entries()){const key=`password:${p.nationalId}:${await digest(p.nationalId+':'+i)}`;if(!have.has(key))pw.push({key,nid:p.nationalId,pass})}
  const hashed=await Promise.all(pw.map(async x=>[crypto.randomUUID(),'yemot',x.key,x.nid,'password',JSON.stringify({hash:await hashPassword(x.pass)}),at]));
  await insertMany(db,'legacy',['id','source','rowKey','nationalId','kind','payload','createdAt'],hashed);
  await insertMany(db,'ledger',['id','participantId','delta','reason','reference','actor','createdAt'],part.filter(p=>p.opening>0).map(p=>[crypto.randomUUID(),ids.get(p.nationalId),p.opening,`יתרת פתיחה מימות (נצבר ${p.earned}, תיקוני מנהל ${p.adjust})`,'yemot:opening:'+p.nationalId,actor,at]));
  progress('participants',done+=part.length);
 }
 done=0;
 for(const part of chunk(plan.legacy,300)){
  await insertMany(db,'legacy',['id','source','rowKey','nationalId','kind','payload','createdAt'],part.map(r=>[crypto.randomUUID(),'yemot',r.rowKey,r.nationalId,r.kind,JSON.stringify(r.payload),at]));
  progress('legacy',done+=part.length);
 }
 await insertMany(db,'legacy',['id','source','rowKey','nationalId','kind','payload','createdAt'],plan.review.map((r,i)=>[crypto.randomUUID(),'yemot',`review:${r.issue}:${r.nationalId}:${i}`,r.nationalId,'review',JSON.stringify(r),at]));
 await db.prepare('INSERT INTO audit(id,actor,action,target,details,createdAt) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'import.yemot','all',JSON.stringify(plan.summary),at).run();
 return plan.summary;
}
