import * as D from './domain.mjs';
import * as STT from './transcribe.mjs';
const text=value=>({text:value});
const token=()=>crypto.randomUUID().replaceAll('-','');
const statement=(db,sql,...args)=>db.prepare(sql).bind(...args);
const first=(db,sql,...args)=>statement(db,sql,...args).first();
const prompt=(s,message,min=1,max=1)=>{
 s.field='tv_'+token();s.response={type:'getDTMF',name:s.field,files:[text(message)],min,max,timeout:15,skipKey:'#',skipValue:'ERROR'};
 return s.response;
};
const finish=message=>({type:'simpleMessage',files:[text(message)],addParams:{tv_done:'1'}});
function menu(s,prefix=''){
 s.stage='menu';return prompt(s,prefix+' למבחנים הקישו 1. ליתרת נקודות הקישו 2. להזמנת הטבה הקישו 3. להזמנות וביטולים הקישו 4. לשמיעת תשובות הצוות הקישו 5. להשארת הודעה לצוות הקישו 6. ליציאה הקישו 9.');
}
function question(s,a){
 if(a.completed)return menu(s,'המבחן הושלם. נזקפו לחשבונך '+a.score+' נקודות.');
 if(!a.question)return menu(s,'לא נמצאה שאלה להמשך. יש לפנות לצוות.');
 s.stage='answer';s.attemptId=a.id;s.questionId=a.question.id;s.optionCount=a.question.options.length;
 const head=(a.question.bonus?'שאלת בונוס. ':'שאלה '+(a.answered+1)+' מתוך '+a.total+'. ');
 const opts=a.question.options.map((o,i)=>'לתשובה '+o+' הקישו '+(i+1)).join('. ');
 const r=prompt(s,head+(a.question.audioKey?'':(a.question.text||'')+'. ')+opts);
 if(a.question.audioKey?.startsWith('tl:'))r.files=[text(head),{fileId:a.question.audioKey.split(':')[1],extensionId:process.env.TECHNOLINE_AUDIO_EXTENSION||''},text(opts)];
 return r;
}
const loginPrompt=(s,prefix='')=>{s.stage='nationalId';return prompt(s,prefix+'הקישו תעודת זהות בת 9 ספרות. להרשמה חדשה הקישו 0 וסולמית.',1,9)};
async function advance(db,s,input,params={}){
 if(s.stage==='nationalId'&&input==='0'){s.stage='regId';return prompt(s,'הרשמה חדשה. הקישו את תעודת הזהות שלכם, 9 ספרות כולל אפסים מובילים.',9,9);}
 if(s.stage==='regId'){
  if(!/^\d{9}$/.test(input))return prompt(s,'תעודת הזהות אינה תקינה. הקישו 9 ספרות.',9,9);
  if(await first(db,'SELECT id FROM participants WHERE nationalId=?',input))return loginPrompt(s,'תעודת הזהות כבר רשומה במערכת. ');
  s.regId=input;s.stage='regPass';return prompt(s,'בחרו סיסמה של 6 עד 12 ספרות ובסיום סולמית.',6,12);
 }
 if(s.stage==='regPass'){
  if(!/^\d{6,12}$/.test(input))return prompt(s,'הסיסמה צריכה להכיל 6 עד 12 ספרות. הקישו שוב ובסיום סולמית.',6,12);
  s.regHash=await D.hashPassword(input);s.stage='regPass2';return prompt(s,'הקישו שוב את הסיסמה לאימות ובסיום סולמית.',6,12);
 }
 if(s.stage==='regPass2'){
  const salt=s.regHash.split(':')[0];
  if(s.regHash!==salt+':'+await D.derive(input,salt)){delete s.regHash;s.stage='regPass';return prompt(s,'הסיסמאות אינן תואמות. בחרו סיסמה של 6 עד 12 ספרות ובסיום סולמית.',6,12);}
  await D.register(db,{nationalId:s.regId,name:'נרשם בטלפון',password:input});
  const auth=await D.login(db,s.regId,input);delete s.regHash;delete s.regId;s.pid=auth.participant.id;s.expires=Date.now()+30*60000;
  s.stage='regPhone';return prompt(s,'נרשמתם בהצלחה. כדי שתוכלו לשחזר סיסמה, הקישו מספר טלפון ובסיום סולמית. לדילוג הקישו סולמית.',1,10);
 }
 if(s.stage==='regPhone'){
  let note='';if(/^0\d{8,9}$/.test(input)){await statement(db,'UPDATE participants SET recoveryPhone=? WHERE id=?',input,s.pid).run();note='טלפון השחזור נשמר. ';}else if(input!=='ERROR')note='המספר אינו תקין ולא נשמר. ';
  s.stage='regVoice';s.field='tv_'+token();
  return {type:'record',name:s.field,max:20,min:1,confirm:'no',hangupSave:'yes',files:[text(note+'לאחר הצליל אמרו את שמכם המלא ואת שם הישיבה שבה אתם לומדים, ובסיום הקישו סולמית.')]};
 }
 if(s.stage==='regVoice'){
  const fileId=params['FILEID_'+s.field];
  if(fileId){await statement(db,'UPDATE participants SET regAudioKey=? WHERE id=?','technoline:'+fileId,s.pid).run();STT.transcribeRegistration(db,s.pid,fileId);}
  return menu(s,'תודה, ההרשמה הושלמה.');
 }
 if(s.stage==='nationalId'){
  if(!/^\d{9}$/.test(input))return loginPrompt(s,'תעודת הזהות אינה תקינה. ');
  s.nationalId=input;s.stage='password';return prompt(s,'הקישו את הסיסמה ובסיום סולמית.',1,12);
 }
 if(s.stage==='password'){
  try{const auth=await D.login(db,s.nationalId,input);s.pid=auth.participant.id;delete s.nationalId;s.expires=Date.now()+30*60000;return menu(s,'שלום '+auth.participant.name+'.');}
  catch(e){delete s.nationalId;return loginPrompt(s,e.message+'. ');}
 }
 if(!s.pid)return finish('יש להתקשר מחדש ולהזדהות.');
 const state=await D.participantState(db,s.pid);
 if(state.participant.blocked)return finish('החשבון חסום. יש לפנות לצוות.');
 if(s.stage==='menu'){
  if(input==='9'){s.stage='done';return finish('תודה ולהתראות.');}
  if(input==='2')return menu(s,'יתרתך היא '+state.participant.balance+' נקודות.');
  if(input==='1'){
   if(!state.exams.length)return menu(s,'אין מבחנים פתוחים למסלול שלך כעת.');
   s.stage='examSelect';s.items=state.exams.slice(0,9).map(e=>e.id);
   return prompt(s,state.exams.slice(0,9).map((e,i)=>'למבחן '+e.title+', '+e.week+', הקישו '+(i+1)).join('. '));
  }
  if(input==='3'){
   if(!state.benefits.length)return menu(s,'אין הטבות פתוחות להזמנה כעת.');
   s.stage='benefitSelect';s.items=state.benefits.slice(0,9).map(b=>b.id);
   return prompt(s,state.benefits.slice(0,9).map((b,i)=>'להטבה '+b.title+', במחיר '+b.cost+' נקודות ליחידה, הקישו '+(i+1)).join('. '));
  }
  if(input==='4'){
   const orders=state.orders.filter(o=>o.status!=='cancelled').slice(0,9);
   if(!orders.length)return menu(s,'אין לך הזמנות.');
   s.stage='orderSelect';s.items=orders.map(o=>o.id);
   return prompt(s,orders.map((o,i)=>'להזמנה של '+JSON.parse(o.snapshot).title+', בכמות '+o.quantity+', הקישו '+(i+1)).join('. '));
  }
  if(input==='5'){
   const replies=state.messages.filter(m=>m.reply).slice(0,10);
   const replies2=state.messages.filter(m=>m.reply||m.replyAudioKey).slice(0,10);
   if(!replies2.length)return menu(s,'אין תשובות חדשות.');
   const r=menu(s,'');r.files=[...replies2.flatMap(m=>[text('תשובה בנושא '+m.subject+'.'),m.replyAudioKey?.startsWith('tl:')?{fileId:m.replyAudioKey.split(':')[1],extensionId:process.env.TECHNOLINE_AUDIO_EXTENSION||''}:text(m.reply)]),...r.files];return r;
  }
  if(input==='6'){
   const recent=await first(db,'SELECT COUNT(*) AS n FROM messages WHERE participantId=? AND audioKey IS NOT NULL AND createdAt>?',s.pid,new Date(Date.now()-864e5).toISOString());
   if(Number(recent?.n)>=2)return menu(s,'ניתן להשאיר עד 2 הודעות ביממה. נסו שוב מחר.');
   s.stage='record';s.field='tv_'+token();
   return {type:'record',name:s.field,max:30,min:2,confirm:'confirmOnly',hangupSave:'yes',files:[text('השאירו הודעה לצוות לאחר הצליל, עד 30 שניות. בסיום הקישו סולמית.')]};
  }
  return menu(s,'הבחירה אינה תקינה.');
 }
 if(s.stage==='record'){
  const fileId=params['FILEID_'+s.field];
  if(!fileId)return menu(s,'ההקלטה לא נשמרה.');
  const mid=await D.addMessage(db,s.pid,{subject:'הודעה קולית מהטלפון',audioKey:'technoline:'+fileId});
  if(mid)STT.transcribeMessage(db,mid,fileId);
  return menu(s,'ההודעה נשמרה. תשובת הצוות תושמע בתפריט התשובות.');
 }
 if(s.stage==='examSelect'){
  const eid=s.items[Number(input)-1];if(!eid)return menu(s,'הבחירה אינה תקינה.');
  return question(s,await D.startAttempt(db,s.pid,eid));
 }
 if(s.stage==='answer'){
  if(!/^[1-9]$/.test(input)||Number(input)>s.optionCount)return question(s,await D.startAttempt(db,s.pid,(await first(db,'SELECT examId FROM attempts WHERE id=?',s.attemptId)).examId));
  const a=await D.answerQuestion(db,s.pid,s.attemptId,s.questionId,Number(input)-1);return question(s,a);
 }
 if(s.stage==='benefitSelect'){
  const bid=s.items[Number(input)-1];const b=state.benefits.find(x=>x.id===bid);if(!b)return menu(s,'הבחירה אינה תקינה.');
  s.benefitId=bid;s.stage='quantity';return prompt(s,'בחרת '+b.title+'. הקישו את מספר היחידות ובסיום סולמית.',1,5);
 }
 if(s.stage==='quantity'){
  const n=Number(input);if(!/^\d+$/.test(input)||n<1||n>99999)return menu(s,'הכמות אינה תקינה.');
  const b=state.benefits.find(x=>x.id===s.benefitId);if(!b)return menu(s,'ההטבה נסגרה להזמנה.');
  s.quantity=n;s.stage='confirm';s.orderKey='technoline:'+s.callHash+':'+token();
  return prompt(s,'הזמנת '+n+' יחידות של '+b.title+'. סך הכול '+n*b.cost+' נקודות. לאישור וניכוי הנקודות הקישו 1. לביטול הקישו 2.');
 }
 if(s.stage==='confirm'){
  if(input!=='1')return menu(s,'ההזמנה לא בוצעה.');
  const o=await D.placeOrder(db,s.pid,s.benefitId,s.quantity,s.orderKey);
  return menu(s,'ההזמנה נקלטה. נוכו '+o.total+' נקודות. ניתן לשמוע את פרטי ההזמנה בתפריט ההזמנות.');
 }
 if(s.stage==='orderSelect'){
  const oid=s.items[Number(input)-1],o=state.orders.find(o=>o.id===oid);if(!o)return menu(s,'הבחירה אינה תקינה.');
  s.orderId=oid;s.stage='cancelConfirm';const b=JSON.parse(o.snapshot);
  return prompt(s,'הזמנה של '+b.title+', בכמות '+o.quantity+'. החנות תוכל לאתר אותה לפי תעודת הזהות שלך. לבקשת ביטול וזיכוי הקישו 1. לחזרה הקישו 2.');
 }
 if(s.stage==='cancelConfirm'){
  if(input==='1'){await D.cancelOrder(db,s.pid,s.orderId,s.pid);return menu(s,'ההזמנה בוטלה והנקודות הוחזרו.');}
  return menu(s);
 }
 return menu(s);
}
/**
 * Verified field names from PBX_DOCUMENTATION_CENTER.md and
 * ZACK770/IVR-MORTAGE/dist/worker.js. No live call has been verified.
 * Deployment must provide a reachable HTTPS gateway; an owner-private Site
 * cannot receive PBX callbacks directly without service access mediation.
 */
export async function handleTechnolineCall(db,params){
 if(params.PBXcallStatus==='HANGUP'||params.tv_done==='1')return {type:'hangup'};
 const callId=String(params.PBXcallId||'');
 if(!callId||callId.length>200)return finish('לא ניתן לזהות את השיחה. אנא התקשרו מחדש.');
 const callHash=await D.digest(callId),key='ivr-call:'+callHash;
 const saved=await first(db,'SELECT value FROM settings WHERE key=?',key);
 let state=saved?JSON.parse(saved.value):null;
 if(state&&state.expires<Date.now())state=null;
 if(!state){
  state={callHash,stage:'nationalId',expires:Date.now()+30*60000};
  prompt(state,'ברוכים הבאים לטעמו וראו. הקישו תעודת זהות בת 9 ספרות כולל אפסים מובילים. להרשמה חדשה הקישו 0 וסולמית.',1,9);
 }else if(state.field&&Object.hasOwn(params,state.field)){
  try{state.response=await advance(db,state,String(params[state.field]),params);}
  catch(e){state.response=menu(state,e instanceof D.DomainError?e.message:'הפעולה לא הושלמה. יש לבדוק את החשבון לפני ניסיון נוסף.');}
 }
 const response=state.response||menu(state);
 // Named inputs can be resent by paramsMode=chain. Remove them from subsequent callbacks.
 const result={...response,removeParams:Object.keys(params).filter(k=>k.startsWith('tv_')&&k!=='tv_done')};
 await statement(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(state)).run();
 return result;
}
