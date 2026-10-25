import * as D from './domain.mjs';
const tables=['participants','exams','attempts','answers','ledger','benefits','cards','orders','messages','staff','audit','sessions','auth_limits','legacy','shipments','settings'];
const pattern=new RegExp('\\b('+tables.join('|')+')\\b','g');
export function youthDb(db){return {prepare(sql){return db.prepare(sql.replace(pattern,n=>'b_'+n))},batch(statements){return db.batch(statements)}}}
const uid=()=>crypto.randomUUID();
const stmt=(db,q,...a)=>db.prepare(q).bind(...a);
const first=(db,q,...a)=>stmt(db,q,...a).first();
function fail(message,status=400){throw new D.DomainError(message,status)}
export const BRAND=Object.freeze({name:'בפנים',tagline:'דברים ששווה לפתוח',invitation:'יש פה מקום בשבילך.',homeTitle:'יש בך יותר.\nבוא לגלות מה.',homeText:'פותחים שאלות. מגלים כוחות. לוקחים משהו לחיים.',library:'פותחים עניין',challenges:'בוחנים את זה',rewards:'הרווחת את זה',wallet:'מה שצברת',help:'מדברים על זה',start:'יאללה, נכנסים',resume:'ממשיכים מאיפה שעצרנו',submit:'סיימתי. אפשר להגיש',review:'רגע, עובר על התשובות',complete:'פתחת עוד משהו.',empty:'עוד דברים טובים בדרך.',byline:'מבית טעמו וראו'});
export const DEFAULT_WEB_SETTINGS=Object.freeze({answerMode:'review',layout:'one',shuffle:true,showCorrect:false});
function username(v){const s=String(v||'').normalize('NFKC').trim().toLowerCase();if(!/^[\p{L}\p{N}_-]{3,24}$/u.test(s))fail('שם המשתמש צריך להכיל 3–24 אותיות, ספרות, קו תחתון או מקף');return s}
export async function registerYouth(raw,data){
 const db=youthDb(raw),nationalId=username(data.username),name=String(data.name||'').trim(),password=String(data.password||'');
 if(name.length<2||name.length>60)fail('איך קוראים לך? אפשר גם שם שבו נוח לך שנפנה אליך.');
 if(password.length<8||password.length>128)fail('כדאי לבחור סיסמה עם לפחות 8 תווים. אפשר לשלב אותיות ומספרים.');
 const id=uid(),hash=await D.hashPassword(password);
 try{await db.batch([stmt(db,'INSERT INTO participants(id,nationalId,name,passwordHash,createdAt) VALUES(?,?,?,?,?)',id,nationalId,name,hash,D.now()),D.auditStatement(db,'registration','youth.register',id)])}catch(e){if(String(e).includes('UNIQUE'))fail('שם המשתמש הזה כבר תפוס. ננסה שם אחר?');throw e}
 return {id,name,username:nationalId};
}
export function loginYouth(raw,name,password){return D.login(youthDb(raw),username(name),password)}
function normalizeSettings(s={}){
 const out={...DEFAULT_WEB_SETTINGS,...s};
 if(!['review','locked'].includes(out.answerMode)||!['one','all'].includes(out.layout))fail('הגדרת ביצוע מבחן אינה תקינה');
 if(out.answerMode==='locked'&&out.layout==='all')fail('בנעילת תשובה מיידית מציגים שאלה אחת בכל פעם');
 return {answerMode:out.answerMode,layout:out.layout,shuffle:!!out.shuffle,showCorrect:!!out.showCorrect};
}
export async function saveYouthExam(raw,e,actor){
 const db=youthDb(raw),settings=normalizeSettings(e.webSettings),id=e.id||uid();
 const exam={...e,opensAt:new Date(e.opensAt).toISOString(),closesAt:new Date(e.closesAt).toISOString(),id};
 D.validateExam(exam);
 if(await first(db,'SELECT id FROM attempts WHERE examId=? LIMIT 1',id))fail('האתגר כבר התחיל אצל משתתפים. אפשר לשכפל ולערוך עותק חדש.');
 const lesson={headline:String(e.headline||e.title).slice(0,150),intro:String(e.intro||'').slice(0,1000),body:String(e.body||'').slice(0,30000),durationMinutes:Math.max(1,Math.min(120,Number(e.durationMinutes)||5)),accent:['lime','violet','orange'].includes(e.accent)?e.accent:'lime'};
 await db.batch([
 stmt(db,'INSERT INTO exams(id,title,materialKey,week,track,kind,opensAt,closesAt,questionCount,questions,published,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,materialKey=excluded.materialKey,week=excluded.week,track=excluded.track,kind=excluded.kind,opensAt=excluded.opensAt,closesAt=excluded.closesAt,questionCount=excluded.questionCount,questions=excluded.questions,published=excluded.published',id,e.title,e.materialKey,e.week,e.track,e.kind,exam.opensAt,exam.closesAt,e.questionCount,JSON.stringify(e.questions),e.published?1:0,D.now()),
 stmt(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','web-exam:'+id,JSON.stringify({settings,lesson})),
 D.auditStatement(db,actor,'youth.exam.save',id,{settings})
 ]);return {id};
}
async function examConfig(db,eid){const s=await first(db,'SELECT value FROM settings WHERE key=?','web-exam:'+eid);return s?JSON.parse(s.value):{settings:{...DEFAULT_WEB_SETTINGS},lesson:{}}}
export async function youthCatalog(raw){
 const db=youthDb(raw),exams=await D.rows(db,'SELECT id,title,week,track,kind,opensAt,closesAt,questionCount FROM exams WHERE published=1 ORDER BY opensAt DESC LIMIT 200');
 const out=[];for(const e of exams){const {lesson,settings}=await examConfig(db,e.id);out.push({...e,...lesson,webSettings:settings})}
 const benefits=await D.rows(db,'SELECT * FROM benefits WHERE active=1 AND opensAt<=? AND closesAt>? ORDER BY createdAt DESC',D.now(),D.now());
 return {brand:BRAND,exams:out,benefits,settingsProvisional:true};
}
function shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const span=i+1,limit=Math.floor(4294967296/span)*span;let r;do{r=crypto.getRandomValues(new Uint32Array(1))[0]}while(r>=limit);const j=r%span;[out[i],out[j]]=[out[j],out[i]]}return out}
async function activeParticipant(db,pid){const p=await D.getParticipant(db,pid);if(p.blocked)fail('החשבון ממתין לבדיקה. אפשר לפנות לצוות ונעזור לך.',403);return p}
async function ownedAttempt(db,pid,aid){const a=await first(db,'SELECT * FROM attempts WHERE id=? AND participantId=?',aid,pid);if(!a)fail('האתגר לא נמצא בחשבון שלך',404);return a}
export async function startYouthAttempt(raw,pid,eid){
 const db=youthDb(raw),p=await activeParticipant(db,pid),e=await first(db,'SELECT * FROM exams WHERE id=?',eid);
 if(!e||!e.published||e.opensAt>D.now()||e.closesAt<=D.now())fail('האתגר הזה אינו פתוח כרגע.');
 const bk=await raw.prepare('SELECT id FROM b_booklets WHERE examId=?').bind(eid).first();
 if(bk&&!(await raw.prepare('SELECT code FROM b_booklet_codes WHERE bookletId=? AND participantId=?').bind(bk.id,pid).first()))fail('לאתגר הזה נכנסים עם הקוד שבגב החוברת.',403);
 if(e.track!==D.effectiveTrack(p))fail('האתגר הזה אינו זמין במסלול שלך.',403);
 const material=e.week+':'+e.kind+':'+e.materialKey;
 let a=await first(db,'SELECT * FROM attempts WHERE participantId=? AND materialKey=?',pid,material);
 if(a&&a.examId!==eid)fail('כבר פתחת אתגר על החומר הזה.');
 if(!a){
 const config=await examConfig(db,eid),questions=JSON.parse(e.questions);
 a={id:uid(),participantId:pid,examId:eid,materialKey:material,snapshot:JSON.stringify((config.settings.shuffle?shuffle(questions):questions).slice(0,e.questionCount)),createdAt:D.now(),completed:0,score:0};
 try{await db.batch([stmt(db,'INSERT INTO attempts(id,participantId,examId,materialKey,snapshot,createdAt) VALUES(?,?,?,?,?,?)',a.id,pid,eid,material,a.snapshot,a.createdAt),raw.prepare('INSERT INTO b_web_attempts(attemptId,settings,payload,revision,finalized) VALUES(?,?,?,0,0)').bind(a.id,JSON.stringify(config.settings),'{}')])}
 catch(error){const winner=await first(db,'SELECT * FROM attempts WHERE participantId=? AND materialKey=?',pid,material);if(!winner||winner.examId!==eid)throw error;a=winner}
 }
 return youthAttemptView(raw,pid,a.id);
}
export async function redeemBookletCode(raw,pid,input){
 const code=String(input||'').toUpperCase().replace(/[^0-9A-Z]/g,''),c=code&&await raw.prepare('SELECT * FROM b_booklet_codes WHERE code=?').bind(code).first();
 if(!c||c.voided)fail('הקוד לא נמצא. כדאי לבדוק שוב את הקוד שבגב החוברת.',404);
 const b=await raw.prepare('SELECT * FROM b_booklets WHERE id=?').bind(c.bookletId).first();if(!b?.examId)fail('האתגר של החוברת הזו עוד לא נפתח.');
 if(c.participantId&&c.participantId!==pid)fail('הקוד הזה כבר נוצל. לכל חוברת יש קוד משלה.',409);
 let locked=false;
 if(!c.participantId){
  if(await raw.prepare('SELECT code FROM b_booklet_codes WHERE bookletId=? AND participantId=?').bind(b.id,pid).first())fail('כבר נבחנת על החוברת הזו עם קוד אחר.',409);
  await raw.prepare('UPDATE b_booklet_codes SET participantId=?,usedAt=? WHERE code=? AND participantId IS NULL').bind(pid,D.now(),code).run();
  if((await raw.prepare('SELECT participantId FROM b_booklet_codes WHERE code=?').bind(code).first())?.participantId!==pid)fail('הקוד הזה כבר נוצל.',409);locked=true;
 }
 try{return {examId:b.examId,attempt:await startYouthAttempt(raw,pid,b.examId)}}
 catch(e){if(locked)await raw.prepare('UPDATE b_booklet_codes SET participantId=NULL,usedAt=NULL WHERE code=?').bind(code).run();throw e}
}
export async function youthAttemptView(raw,pid,aid){
 const db=youthDb(raw),a=await ownedAttempt(db,pid,aid),draft=await first(raw,'SELECT * FROM b_web_attempts WHERE attemptId=?',aid),settings=draft?JSON.parse(draft.settings):DEFAULT_WEB_SETTINGS;
 const answered=await D.rows(db,'SELECT questionId,choice FROM answers WHERE attemptId=?',aid);
 const choices=settings.answerMode==='locked'?Object.fromEntries(answered.map(r=>[r.questionId,r.choice])):JSON.parse(draft?.payload||'{}');
 const snapshot=JSON.parse(a.snapshot);
 const questions=snapshot.map(q=>({id:q.id,text:q.text,options:q.options,audioKey:q.audioKey||null,points:q.points,...(a.completed&&settings.showCorrect?{correct:q.correct,explanation:q.explanation||''}:{})}));
 return {id:a.id,examId:a.examId,completed:!!a.completed,score:a.completed?a.score:null,questions,choices,revision:draft?.revision||0,settings,answered:Object.keys(choices).length,total:questions.length};
}
export async function saveYouthChoice(raw,pid,aid,qid,choice,revision){
 const db=youthDb(raw);await activeParticipant(db,pid);const a=await ownedAttempt(db,pid,aid);
 if(a.completed)fail('האתגר כבר הוגש. התשובות נשמרו ולא משתנות.');
 const e=await first(db,'SELECT * FROM exams WHERE id=?',a.examId);if(!e.published||e.closesAt<=D.now())fail('הזמן להגשת האתגר הסתיים.');
 const d=await first(raw,'SELECT * FROM b_web_attempts WHERE attemptId=?',aid);
 const settings=JSON.parse(d.settings),q=JSON.parse(a.snapshot).find(q=>q.id===qid);
 if(!q||!Number.isInteger(choice)||choice<0||choice>=q.options.length)fail('צריך לבחור אחת מהתשובות שמופיעות בשאלה.');
 if(settings.answerMode==='locked'){await D.answerQuestion(db,pid,aid,qid,choice);return youthAttemptView(raw,pid,aid);}
 if(!Number.isInteger(revision)||revision!==d.revision||d.finalized)fail('האתגר עודכן בחלון אחר. נרענן ונמשיך מהתשובה שנשמרה.',409);
 const payload={...JSON.parse(d.payload),[qid]:choice};
 const result=await raw.prepare('UPDATE b_web_attempts SET payload=?,revision=revision+1 WHERE attemptId=? AND revision=? AND finalized=0').bind(JSON.stringify(payload),aid,revision).run();
 if(!result.meta.changes)fail('האתגר עודכן. כדאי לרענן לפני שממשיכים.',409);
 return youthAttemptView(raw,pid,aid);
}
export async function submitYouthAttempt(raw,pid,aid,revision){
 const db=youthDb(raw);await activeParticipant(db,pid);const a=await ownedAttempt(db,pid,aid);if(a.completed)return youthAttemptView(raw,pid,aid);
 const e=await first(db,'SELECT * FROM exams WHERE id=?',a.examId);if(!e.published||e.closesAt<=D.now())fail('הזמן להגשת האתגר הסתיים.');
 const draft=await first(raw,'SELECT * FROM b_web_attempts WHERE attemptId=?',aid);if(!draft||revision!==draft.revision)fail('יש תשובות חדשות שנשמרו. כדאי לרענן ולבדוק אותן לפני ההגשה.',409);
 const settings=JSON.parse(draft.settings);if(settings.answerMode==='locked')fail('באתגר הזה ההגשה מתבצעת כשמסיימים לענות על השאלה האחרונה.');
 const qs=JSON.parse(a.snapshot),choices=JSON.parse(draft.payload);
 if(qs.some(q=>!Object.hasOwn(choices,q.id)))fail('נשארו שאלות פתוחות. עוד רגע מסיימים.');
 const ref='exam:'+aid,score=qs.reduce((n,q)=>n+(choices[q.id]===q.correct?q.points:0),0),date=D.now();
 const tx=[raw.prepare('UPDATE b_web_attempts SET finalized=1 WHERE attemptId=? AND revision=? AND finalized=0').bind(aid,revision)];
 for(const q of qs)tx.push(stmt(db,'INSERT OR IGNORE INTO answers(id,attemptId,questionId,choice,points,createdAt) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM b_web_attempts WHERE attemptId=? AND revision=? AND finalized=1)',uid(),aid,q.id,choices[q.id],choices[q.id]===q.correct?q.points:0,date,aid,revision));
 tx.push(stmt(db,'INSERT OR IGNORE INTO ledger(id,participantId,delta,reason,reference,actor,createdAt) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM b_web_attempts WHERE attemptId=? AND revision=? AND finalized=1)',uid(),pid,score,'השלמת אתגר · בפנים',ref,'youth-web',date,aid,revision));
 tx.push(stmt(db,'UPDATE attempts SET completed=1,score=?,completedAt=COALESCE(completedAt,?) WHERE id=? AND EXISTS(SELECT 1 FROM b_web_attempts WHERE attemptId=? AND revision=? AND finalized=1)',score,date,aid,aid,revision));
 tx.push(D.auditStatement(db,pid,'youth.attempt.submit',aid));
 await raw.batch(tx);
 const view=await youthAttemptView(raw,pid,aid);if(!view.completed)fail('האתגר עודכן בזמן ההגשה. בדוק את התשובות והגש שוב.',409);return view;
}
export async function youthState(raw,pid){
 const db=youthDb(raw);await activeParticipant(db,pid);const base=await D.participantState(db,pid),catalog=await youthCatalog(raw);
 const attempts=await D.rows(db,'SELECT id,examId,completed,score,createdAt,completedAt FROM attempts WHERE participantId=? ORDER BY createdAt DESC',pid);
 const {nationalId,...participant}=base.participant;
 return {...base,participant:{...participant,username:nationalId},brand:BRAND,exams:catalog.exams.filter(e=>e.track===base.track),attempts};
}
export async function saveYouthBenefit(raw,b,actor){return D.saveBenefit(youthDb(raw),b,actor)}
export async function youthOrder(raw,pid,bid,quantity,key){return D.placeOrder(youthDb(raw),pid,bid,quantity,'youth:'+key)}
export async function youthCancel(raw,pid,oid){return D.cancelOrder(youthDb(raw),pid,oid,pid)}
export async function youthMessage(raw,pid,b){await activeParticipant(youthDb(raw),pid);return D.addMessage(youthDb(raw),pid,b)}
