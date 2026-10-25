import * as D from './domain.mjs';
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
 s.stage='menu';return prompt(s,prefix+' למבחנים הקישו 1. ליתרת נקודות הקישו 2. להזמנת הטבה הקישו 3. להזמנות וביטולים הקישו 4. לשמיעת תשובות הצוות הקישו 5. ליציאה הקישו 9.');
}
function question(s,a){
 if(a.completed)return menu(s,'המבחן הושלם. נזקפו לחשבונך '+a.score+' נקודות.');
 if(!a.question)return menu(s,'לא נמצאה שאלה להמשך. יש לפנות לצוות.');
 s.stage='answer';s.attemptId=a.id;s.questionId=a.question.id;s.optionCount=a.question.options.length;
 const spoken='שאלה '+(a.answered+1)+' מתוך '+a.total+'. '+(a.question.text||'')+'. '+a.question.options.map((o,i)=>'לתשובה '+o+' הקישו '+(i+1)).join('. ');
 return prompt(s,spoken);
}
async function advance(db,s,input){
 if(s.stage==='nationalId'){
  if(!/^\d{9}$/.test(input))return prompt(s,'תעודת הזהות אינה תקינה. הקישו 9 ספרות כולל אפסים מובילים.',9,9);
  s.nationalId=input;s.stage='password';return prompt(s,'הקישו את הסיסמה ובסיום סולמית.',1,12);
 }
 if(s.stage==='password'){
  try{const auth=await D.login(db,s.nationalId,input);s.pid=auth.participant.id;delete s.nationalId;s.expires=Date.now()+30*60000;return menu(s,'שלום '+auth.participant.name+'.');}
  catch(e){delete s.nationalId;s.stage='nationalId';return prompt(s,e.message+'. הקישו תעודת זהות מחדש.',9,9);}
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
   return menu(s,replies.length?replies.map(m=>'תשובה בנושא '+m.subject+'. '+m.reply).join('. '):'אין תשובות חדשות.');
  }
  return menu(s,'הבחירה אינה תקינה.');
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
  prompt(state,'ברוכים הבאים לטעמו וראו. הקישו תעודת זהות בת 9 ספרות כולל אפסים מובילים.',9,9);
 }else if(state.field&&Object.hasOwn(params,state.field)){
  try{state.response=await advance(db,state,String(params[state.field]));}
  catch(e){state.response=menu(state,e instanceof D.DomainError?e.message:'הפעולה לא הושלמה. יש לבדוק את החשבון לפני ניסיון נוסף.');}
 }
 const response=state.response||menu(state);
 // Named inputs can be resent by paramsMode=chain. Remove them from subsequent callbacks.
 const result={...response,removeParams:Object.keys(params).filter(k=>k.startsWith('tv_')&&k!=='tv_done')};
 await statement(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(state)).run();
 return result;
}
