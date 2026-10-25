import * as D from './domain.mjs';
import * as S from './staff.mjs';
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const rows=async(db,s,...a)=>(await q(db,s,...a).all()).results;
const fail=(m,s=400)=>{throw new D.DomainError(m,s)};
const can={
 admin:()=>true,
 editor:a=>['overview','exams','saveExam','messages','reply'].includes(a),
 support:a=>['overview','participants','participant','pointsReport','messages','reply'].includes(a),
 merchant:a=>['overview','lookupOrder','redeem','merchantOrders'].includes(a)
};
const pub=p=>p&&({id:p.id,nationalId:p.nationalId,name:p.name,institution:p.institution,recoveryPhone:p.recoveryPhone,track:p.track,nextTrack:p.nextTrack,trackEffective:p.trackEffective,balance:p.balance,debt:p.debt,blocked:p.blocked,createdAt:p.createdAt});
const inScope=(o,scope)=>{const b=JSON.parse(o.snapshot);return b.merchant===scope?.merchant&&(!scope.branch||b.branch===scope.branch)};
export async function handleAdmin(db,staff,action,b={}){
 if(!can[staff.role]?.(action))fail('אין לך הרשאה לפעולה זו',403);
 const actor=staff.id,t=D.now();
 switch(action){
  case 'ivrStep':{const {handleTechnolineCall}=await import('./technoline.mjs');const p={PBXcallId:'sim-'+actor+'-'+String(b.callId||'').slice(0,60),PBXphone:'0000000000'};if(b.field){p[b.field]=String(b.value??'');if(b.fileId)p['FILEID_'+b.field]=String(b.fileId)}if(b.hangup)p.PBXcallStatus='HANGUP';return {response:await handleTechnolineCall(db,p)}}
  case 'overview':return {staff,counts:staff.role==='merchant'?{}:(await q(db,"SELECT (SELECT COUNT(*) FROM participants) AS participants,(SELECT COUNT(*) FROM orders WHERE status='pending') AS pendingOrders,(SELECT COUNT(*) FROM messages WHERE status='open') AS openMessages,(SELECT COUNT(*) FROM exams WHERE published=1 AND opensAt<=? AND closesAt>?) AS activeExams",t,t).first())};
  case 'participants':{const s='%'+String(b.search||'').trim()+'%',off=Math.max(0,Math.trunc(Number(b.page)||0))*100;const total=Number((await q(db,'SELECT COUNT(*) AS n FROM participants WHERE nationalId LIKE ? OR name LIKE ?',s,s).first()).n);return {total,participants:(await rows(db,'SELECT * FROM participants WHERE nationalId LIKE ? OR name LIKE ? ORDER BY name,nationalId LIMIT 100 OFFSET ?',s,s,off)).map(pub)}}
  case 'pointsReport':{const P=await import('./points-source.mjs');return {categories:P.CATEGORIES,...await P.pointsReport(db,b)}}
  case 'participant':{const st=await D.participantState(db,b.id);return {...st,participant:pub(await D.getParticipant(db,b.id)),attempts:await rows(db,'SELECT a.id,a.score,a.completed,a.createdAt,e.title FROM attempts a JOIN exams e ON e.id=a.examId WHERE a.participantId=? ORDER BY a.createdAt DESC LIMIT 200',b.id).catch(()=>[])}}
  case 'participantIds':{const s='%'+String(b.search||'').trim()+'%';return {ids:(await rows(db,'SELECT id FROM participants WHERE nationalId LIKE ? OR name LIKE ? LIMIT 5000',s,s)).map(r=>r.id)}}
  case 'participantsByIds':{const ids=(b.ids||[]).slice(0,5000),out=[];for(let i=0;i<ids.length;i+=500){const part=ids.slice(i,i+500);out.push(...await rows(db,`SELECT * FROM participants WHERE id IN (${part.map(()=>'?').join(',')})`,...part))}return {participants:out.map(pub)}}
  case 'bulk':{const ids=[...new Set(b.ids||[])].slice(0,5000);if(!ids.length)fail('לא נבחרו משתתפים');if(b.op==='adjust'&&(!Number(b.delta)||!String(b.reason||'').trim()))fail('נדרשים סכום וסיבה');const txt=String(b.text||'').trim().slice(0,2000);if(b.op==='message'&&!txt)fail('חסר תוכן הודעה');const res={ok:0,failed:[]};
   for(const pid of ids){try{
    if(b.op==='adjust')await D.adjustPoints(db,pid,Number(b.delta),b.reason,actor,b.requestKey+':'+pid,b.mode);
    else if(b.op==='track')await D.changeTrack(db,pid,b.track,actor);
    else if(b.op==='block')await db.batch([q(db,'UPDATE participants SET blocked=? WHERE id=?',b.blocked?1:0,pid),q(db,'DELETE FROM sessions WHERE participantId=?',pid),D.auditStatement(db,actor,'participant.block',pid,{blocked:!!b.blocked,bulk:true})]);
    else if(b.op==='message')await db.batch([q(db,"INSERT INTO messages(id,participantId,subject,body,reply,status,createdAt) VALUES(?,?,?,?,?,'answered',?)",crypto.randomUUID(),pid,'הודעה מהצוות','',txt,t),D.auditStatement(db,actor,'message.send',pid)]);
    else fail('פעולה לא מוכרת');res.ok++}catch(e){res.failed.push({id:pid,error:e.message})}}
   return res}
  case 'register':return {participant:pub(await D.register(db,b.data))};
  case 'adjust':return {entry:await D.adjustPoints(db,b.participantId,Number(b.delta),b.reason,actor,b.requestKey,b.mode)};
  case 'track':return {result:await D.changeTrack(db,b.participantId,b.track,actor)};
  case 'block':await db.batch([q(db,'UPDATE participants SET blocked=? WHERE id=?',b.blocked?1:0,b.participantId),q(db,'DELETE FROM sessions WHERE participantId=?',b.participantId),D.auditStatement(db,actor,'participant.block',b.participantId,{blocked:!!b.blocked})]);return {ok:true};
  case 'resetPassword':if(!/^\d{6,12}$/.test(String(b.password||'')))fail('סיסמה טלפונית: 6–12 ספרות');await db.batch([q(db,'UPDATE participants SET passwordHash=? WHERE id=?',await D.hashPassword(String(b.password)),b.participantId),q(db,'DELETE FROM sessions WHERE participantId=?',b.participantId),D.auditStatement(db,actor,'participant.password',b.participantId)]);return {ok:true};
  case 'exams':return {exams:(await rows(db,'SELECT * FROM exams ORDER BY opensAt DESC LIMIT 200')).map(e=>({...e,questions:JSON.parse(e.questions||'[]')}))};
  case 'saveExam':return {exam:await D.saveExam(db,b.data,actor)};
  case 'benefits':return {benefits:await rows(db,'SELECT * FROM benefits ORDER BY createdAt DESC LIMIT 300')};
  case 'saveBenefit':return {benefit:await D.saveBenefit(db,b.data,actor)};
  case 'orders':return {orders:await rows(db,'SELECT o.*,p.name,p.nationalId FROM orders o JOIN participants p ON p.id=o.participantId WHERE (?=\'\' OR o.status=?) ORDER BY o.createdAt DESC LIMIT 500',b.status||'',b.status||'')};
  case 'transition':return {order:await D.orderTransition(db,b.orderId,b.op,actor)};
  case 'cancelOrder':{const o=await q(db,'SELECT participantId FROM orders WHERE id=?',b.orderId).first();if(!o)fail('הזמנה לא נמצאה',404);return {order:await D.cancelOrder(db,o.participantId,b.orderId,actor,true)}}
  case 'merchantOrders':return {orders:(await rows(db,"SELECT o.id,o.code,o.quantity,o.status,o.snapshot,o.createdAt,o.completedAt,p.name FROM orders o JOIN participants p ON p.id=o.participantId WHERE o.status IN ('pending','exported','completed') ORDER BY o.createdAt DESC LIMIT 1000")).filter(o=>inScope(o,staff.scope)).map(({snapshot,...o})=>({...o,title:JSON.parse(snapshot).title}))};
  case 'lookupOrder':case 'redeem':{
   const o=await q(db,'SELECT o.*,p.name FROM orders o JOIN participants p ON p.id=o.participantId WHERE o.code=?',String(b.code||'').trim().toUpperCase()).first();
   if(!o||(staff.role==='merchant'&&!inScope(o,staff.scope)))fail('קוד לא נמצא בחנות זו',404);
   if(action==='redeem')return {order:await D.orderTransition(db,o.id,'complete',actor,staff.role==='merchant'?staff.scope:null)};
   const {snapshot,...rest}=o;return {order:{...rest,title:JSON.parse(snapshot).title}};
  }
  case 'messages':return {messages:await rows(db,'SELECT m.*,p.name,p.nationalId FROM messages m JOIN participants p ON p.id=m.participantId ORDER BY m.createdAt DESC LIMIT 300')};
  case 'reply':await db.batch([q(db,"UPDATE messages SET reply=?,status='answered' WHERE id=?",String(b.reply||'').slice(0,2000),b.id),D.auditStatement(db,actor,'message.reply',b.id)]);return {ok:true};
  case 'staff':return {staff:await rows(db,'SELECT id,username,name,role,scope,active,createdAt FROM staff_accounts ORDER BY createdAt')};
  case 'createStaff':return {staff:await S.createStaff(db,b.data,actor)};
  case 'staffActive':if(b.id===actor)fail('אי אפשר להשבית את עצמך');await S.setStaffActive(db,b.id,!!b.active,actor);return {ok:true};
  case 'audit':return {audit:await rows(db,'SELECT * FROM audit ORDER BY createdAt DESC LIMIT 300')};
 }
 fail('פעולה לא מוכרת',404);
}
