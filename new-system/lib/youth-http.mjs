import * as D from './domain.mjs';
import * as Y from './youth.mjs';
const cookieName='bifnim_session';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const q=(db,s,...a)=>db.prepare(s).bind(...a);
function sessionCookie(token,secure,clear=false){return cookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+(clear?0:1800)+(secure?'; Secure':'')}
async function member(raw,req){
 const rawCookie=req.headers.get('cookie')||'',match=rawCookie.match(/(?:^|;\s*)bifnim_session=([a-f0-9]{64})(?:;|$)/);
 if(!match)throw new D.DomainError('נכנסים לחשבון וממשיכים מכאן.',401);
 const db=Y.youthDb(raw),session=await q(db,'SELECT * FROM sessions WHERE tokenHash=? AND expiresAt>?',await D.digest(match[1]),D.now()).first();
 if(!session)throw new D.DomainError('החיבור הסתיים. נכנסים שוב וממשיכים מאיפה שעצרת.',401);
 return {id:session.participantId,hash:session.tokenHash};
}
async function safeOrigin(req){
 if(req.method!=='POST')return;
 const origin=req.headers.get('origin');
 if(!origin||origin!==new URL(req.url).origin)throw new D.DomainError('הבקשה לא הגיעה מהאתר. כדאי לרענן ולנסות שוב.',403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new D.DomainError('פורמט הבקשה אינו מתאים',415);
 if(Number(req.headers.get('content-length'))>1000000)throw new D.DomainError('הבקשה גדולה מדי',413);
}
async function throttle(raw,req,key,max=15){
 const db=Y.youthDb(raw),ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-local-client')||'unknown',name=key+':'+await D.digest(ip);
 const result=await q(db,'INSERT INTO auth_limits(key,failures,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN auth_limits.until<? THEN 1 ELSE auth_limits.failures+1 END,until=CASE WHEN auth_limits.until<? THEN excluded.until ELSE auth_limits.until END RETURNING failures',name,new Date(Date.now()+900000).toISOString(),D.now(),D.now()).first();
 if(result.failures>max)throw new D.DomainError('רגע, היו הרבה ניסיונות. אפשר לנסות שוב בעוד רבע שעה.',429);
}
export async function handleYouthHttp(raw,req,path,authorizeAdmin){
 try{
 await safeOrigin(req);const secure=new URL(req.url).protocol==='https:';
 const route=path.replace(/^youth\/?/,'');
 if(req.method==='GET'&&route==='catalog')return json(await Y.youthCatalog(raw));
 if(req.method==='POST'&&route==='register'){
  await throttle(raw,req,'register',5);const b=await req.json();await Y.registerYouth(raw,b);const auth=await Y.loginYouth(raw,b.username,b.password);
  return json({participant:{id:auth.participant.id,name:auth.participant.name} },201,{'Set-Cookie':sessionCookie(auth.token,secure)});
 }
 if(req.method==='POST'&&route==='login'){
  await throttle(raw,req,'login-http',30);const b=await req.json(),auth=await Y.loginYouth(raw,b.username,b.password);
  return json({participant:{id:auth.participant.id,name:auth.participant.name}},200,{'Set-Cookie':sessionCookie(auth.token,secure)});
 }
 if(route.startsWith('admin')){
  const user=await authorizeAdmin(req);if(user.role!=='admin'&&user.role!=='editor')throw new D.DomainError('נדרשות הרשאות לניהול המודול',403);
  if(req.method==='GET'){
   const db=Y.youthDb(raw);return json({exams:await D.rows(db,'SELECT * FROM exams ORDER BY createdAt DESC'),benefits:user.role==='admin'?await D.rows(db,'SELECT * FROM benefits'):[],participants:user.role==='admin'?await D.rows(db,'SELECT id,nationalId AS username,name,balance,createdAt FROM participants'):[],brand:Y.BRAND,defaults:Y.DEFAULT_WEB_SETTINGS});
  }
  const b=await req.json();
  if(b.action==='saveExam')return json(await Y.saveYouthExam(raw,b.data,user.userId));
  if(user.role!=='admin')throw new D.DomainError('הפעולה דורשת מנהל',403);
  if(b.action==='saveBenefit')return json(await Y.saveYouthBenefit(raw,b.data,user.userId));
  if(b.action==='adjust')return json({data:await D.adjustPoints(Y.youthDb(raw),b.participantId,Number(b.delta),b.reason,user.userId,b.requestKey)||null});
  if(b.action==='reply')return json(await q(Y.youthDb(raw),"UPDATE messages SET reply=?,status='answered' WHERE id=?",b.reply,b.id).run());
  throw new D.DomainError('פעולת ניהול לא מוכרת',404);
 }
 const m=await member(raw,req);
 if(req.method==='GET'&&route==='state')return json(await Y.youthState(raw,m.id));
 if(req.method==='GET'&&route==='attempt'){
  const aid=new URL(req.url).searchParams.get('id');return json(await Y.youthAttemptView(raw,m.id,aid));
 }
 if(req.method!=='POST')throw new D.DomainError('העמוד לא נמצא',404);
 const b=await req.json();let result;
 switch(route){
  case 'logout':await q(Y.youthDb(raw),'DELETE FROM sessions WHERE tokenHash=?',m.hash).run();return json({ok:true},200,{'Set-Cookie':sessionCookie('',secure,true)});
  case 'start':result=await Y.startYouthAttempt(raw,m.id,b.examId);break;
  case 'choice':result=await Y.saveYouthChoice(raw,m.id,b.attemptId,b.questionId,Number(b.choice),b.revision);break;
  case 'submit':result=await Y.submitYouthAttempt(raw,m.id,b.attemptId,b.revision);break;
  case 'order':result=await Y.youthOrder(raw,m.id,b.benefitId,Number(b.quantity),b.requestKey);break;
  case 'cancel':result=await Y.youthCancel(raw,m.id,b.orderId);break;
  case 'message':result=await Y.youthMessage(raw,m.id,b);break;
  case 'card':result=await D.linkCard(Y.youthDb(raw),m.id,b.network,b.number,m.id);break;
  default:throw new D.DomainError('הפעולה לא נמצאה',404);
 }
 return json({ok:true,data:result??null});
 }catch(e){if(e instanceof D.DomainError)return json({error:e.message},e.status);console.error('Youth operation failed',e?.message);return json({error:'משהו לא הסתדר. נבדוק מה נשמר לפני שננסה שוב.'},500)}
}
