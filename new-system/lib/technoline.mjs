import * as D from './domain.mjs';
import * as STT from './transcribe.mjs';
const text=value=>({text:value});
const token=()=>crypto.randomUUID().replaceAll('-','');
const statement=(db,sql,...args)=>db.prepare(sql).bind(...args);
const first=(db,sql,...args)=>statement(db,sql,...args).first();
const prompt=(s,message,min=1,max=1)=>{
 delete s.repeatFiles;s.field='tv_'+token();s.last={message,min,max};s.response={type:'getDTMF',name:s.field,files:[text(message)],min,max,timeout:15,skipKey:'#',skipValue:'ERROR'};
 return s.response;
};
const NONE=v=>v===''||v==='ERROR';
const finish=message=>({type:'simpleMessage',files:[text(message)],addParams:{tv_done:'1'}});
const MENU='למבחנים הקישו 1. ליתרת נקודות הקישו 2. להזמנת הטבה הקישו 3. להזמנות וביטולים הקישו 4. לשמיעת הודעות הצוות הקישו 5. להשארת הודעה לצוות הקישו 6. לשמיעה חוזרת של התפריט הקישו 0. ליציאה הקישו 9.';
function menu(s,prefix=''){s.stage='menu';s.miss=0;return prompt(s,prefix+' '+MENU)}
const again=(s,prefix)=>{
 const previous=s.response,last=s.last,original=s.repeatFiles||previous?.files||[text(last.message)];
 const response=prompt(s,last.message,last.min,last.max);
 response.files=[text(prefix),...original];s.repeatFiles=original;
 return response;
};
const validId=id=>/^\d{9}$/.test(id)&&[...id].reduce((t,d,i)=>{const x=Number(d)*(i%2+1);return t+(x>9?x-9:x)},0)%10===0;
const say=s=>String(s).split('').join(' ');
const ORDER_STATUS=o=>({pending:o.exportedAt?'הועברה לחנות':'ממתינה להעברה לחנות',exported:'הועברה לחנות וממתינה למימוש',completed:'מומשה',failed:'בבירור מול החנות',cancelled:'בוטלה'}[o.status]||'בבירור מול הצוות');
async function playMsg(db,s,prefix=''){
 const m=await first(db,'SELECT subject,reply,replyAudioKey,createdAt FROM messages WHERE id=?',s.items[s.idx]);
 const day=new Date(m.createdAt).toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Jerusalem'});
 const last=s.idx+1>=s.items.length,opts=['לשמיעה חוזרת הקישו 1',!last&&'להודעה הבאה 2',s.idx>0&&'להודעה הקודמת 3','לתגובה להודעה הזו 6','לתפריט הראשי 0'].filter(Boolean).join('. ')+'.';
 const r=prompt(s,(last&&s.items.length>1?'זו ההודעה האחרונה. ':'')+opts);
 r.files=[text(prefix+'הודעה '+(s.idx+1)+' מתוך '+s.items.length+'. '+(m.subject||'הודעה מהצוות')+', מ'+day+'.'),m.replyAudioKey?.startsWith('tl:')?{fileId:m.replyAudioKey.split(':')[1],extensionId:process.env.TECHNOLINE_AUDIO_EXTENSION||''}:text(m.reply),...r.files];
 return r;
}
async function finished(db,s,a,pre){
 const st=a.settings||{};
 if(st.sayPoints===false)return menu(s,pre+'המבחן הושלם. תודה.');
 const c=await first(db,'SELECT COUNT(*) AS n FROM answers WHERE attemptId=? AND points>0',a.id),p=await D.getParticipant(db,s.pid);
 const right='ענית נכון על '+Number(c?.n||0)+' מתוך '+a.total+'. ';
 if(st.minScore&&!a.awarded)return menu(s,pre+'המבחן הושלם. '+right+'לא הגעת לציון המינימלי, ולכן לא נזקפו נקודות.');
 return menu(s,pre+'כל הכבוד! המבחן הושלם. '+right+'נוספו לך '+(a.awarded??a.score)+' נקודות. היתרה שלך עכשיו '+p.balance+' נקודות.');
}
async function question(db,s,a,pre=''){
 if(a.completed)return finished(db,s,a,pre);
 if(!a.question)return menu(s,'לא נמצאה שאלה להמשך. אפשר להשאיר הודעה לצוות במקש 6.');
 s.stage='answer';s.attemptId=a.id;s.questionId=a.question.id;s.optionCount=a.question.options.length;
 const head=pre+(a.question.bonus?'שאלת בונוס. ':'שאלה '+(a.answered+1)+' מתוך '+a.total+'. ');
 const opts=a.question.audioIncludesOptions?'':a.question.options.map((o,i)=>'לתשובה '+o+' הקישו '+(i+1)).join('. ')+'.';
 const r=prompt(s,head+(a.question.audioKey?'':(a.question.text||'')+'. ')+opts);
 if(a.question.audioKey?.startsWith('tl:'))r.files=[text(head),{fileId:a.question.audioKey.split(':')[1],extensionId:process.env.TECHNOLINE_AUDIO_EXTENSION||''},text(opts)];
 return r;
}
const reloadAttempt=async(db,s)=>D.startAttempt(db,s.pid,(await first(db,'SELECT examId FROM attempts WHERE id=?',s.attemptId)).examId);
async function openExam(db,s,eid){
 const prev=await first(db,'SELECT * FROM attempts WHERE participantId=? AND examId=?',s.pid,eid);
 if(prev?.completed){const a=await D.attemptView(db,prev);return menu(s,a.settings.sayPoints===false?'כבר השלמת את המבחן הזה.':'כבר השלמת את המבחן הזה. נזקפו לזכותך '+a.awarded+' נקודות.');}
 const e=await first(db,'SELECT title FROM exams WHERE id=?',eid),a=await D.startAttempt(db,s.pid,eid);
 return question(db,s,a,a.answered?'ממשיכים מהמקום שעצרת. ':'מבחן '+e.title+'. '+a.total+' שאלות. בכל שאלה אפשר להקיש 0 לשמיעה חוזרת, וכוכבית לחזרה לתפריט. ');
}
async function examList(db,s,state,prefix=''){
 if(!state.exams.length)return menu(s,prefix+'אין מבחנים פתוחים למסלול שלך כעת.');
 const done=new Map((await D.rows(db,'SELECT examId,completed FROM attempts WHERE participantId=?',s.pid)).map(r=>[r.examId,r.completed]));
 const all=[...state.exams].sort((a,b)=>Number(!!done.get(a.id))-Number(!!done.get(b.id))||a.closesAt.localeCompare(b.closesAt)||a.id.localeCompare(b.id));
 if(all.length===1&&!prefix)return openExam(db,s,all[0].id);
 s.examPage=Math.min(s.examPage||0,Math.floor((all.length-1)/8));
 const list=all.slice(s.examPage*8,s.examPage*8+8);s.examMore=all.length>(s.examPage+1)*8;
 s.stage='examSelect';s.items=list.map(e=>e.id);
 return prompt(s,prefix+list.map((e,i)=>'למבחן '+e.title+', '+e.week+(done.get(e.id)?', שכבר הושלם':done.has(e.id)?', שהתחלת':'')+', הקישו '+(i+1)).join('. ')+'.'+(s.examMore?' למבחנים נוספים הקישו 9.':'')+(s.examPage?' לעמוד הקודם הקישו כוכבית.':'')+' לחזרה לתפריט הקישו 0.');
}
function benefitList(s,state,prefix=''){
 if(!state.benefits.length)return menu(s,prefix+'אין הטבות פתוחות להזמנה כעת.');
 const all=state.benefits;const page=s.page=Math.min(s.page||0,Math.floor((all.length-1)/8)),more=all.length>(page+1)*8,list=all.slice(page*8,page*8+8);
 s.stage='benefitSelect';s.items=list.map(b=>b.id);s.more=more;
 return prompt(s,prefix+(page?'':'יש לך '+state.participant.balance+' נקודות. ')+list.map((b,i)=>'להטבה '+b.title+', במחיר '+b.cost+' נקודות ליחידה, הקישו '+(i+1)).join('. ')+'.'+(more?' להטבות נוספות הקישו 9.':'')+(page?' לעמוד הקודם הקישו כוכבית.':'')+' לחזרה לתפריט הקישו 0.');
}
function orderList(s,state,prefix=''){
 const all=state.orders.filter(o=>o.status!=='cancelled');s.orderPage=Math.min(s.orderPage||0,Math.max(0,Math.floor((all.length-1)/8)));const orders=all.slice(s.orderPage*8,s.orderPage*8+8);s.orderMore=all.length>(s.orderPage+1)*8;
 if(!orders.length)return menu(s,prefix+'אין לך הזמנות.');
 s.stage='orderSelect';s.items=orders.map(o=>o.id);
 return prompt(s,prefix+orders.map((o,i)=>'להזמנה של '+JSON.parse(o.snapshot).title+', בכמות '+o.quantity+', '+ORDER_STATUS(o)+', הקישו '+(i+1)).join('. ')+'.'+(s.orderMore?' להזמנות נוספות הקישו 9.':'')+(s.orderPage?' לעמוד הקודם הקישו כוכבית.':'')+' לחזרה לתפריט הקישו 0.');
}
async function greet(db,s,name){
 s.pid=s.pid;s.expires=Date.now()+30*60000;
 const st=await D.participantState(db,s.pid);
 const fresh=await first(db,"SELECT COUNT(*) AS n FROM messages WHERE participantId=? AND heardAt IS NULL AND (reply<>'' OR replyAudioKey IS NOT NULL) AND (expiresAt IS NULL OR expiresAt>?)",s.pid,D.now());
 const done=new Set((await D.rows(db,'SELECT examId FROM attempts WHERE participantId=? AND completed=1',s.pid)).map(r=>r.examId));
 const open=st.exams.filter(e=>!done.has(e.id)),n=Number(fresh?.n||0);
 let news='';
 if(n)news+=(n===1?'יש לך הודעה חדשה מהצוות':'יש לך '+n+' הודעות חדשות מהצוות')+'. לשמיעה הקישו 5. ';
 if(open.length)news+=(open.length===1?'פתוח עכשיו מבחן: '+open[0].title:'פתוחים עכשיו '+open.length+' מבחנים')+'. למבחנים הקישו 1. ';
 return menu(s,(name&&name!=='נרשם בטלפון'?'שלום '+name+'. ':'שלום. ')+news);
}
const startRecord=(s,stage,message,max=30,min=2)=>{s.stage=stage;s.field='tv_'+token();return {type:'record',name:s.field,max,min,confirm:stage==='regVoice'?'no':'confirmOnly',hangupSave:'yes',files:[text(message)]}};
const loginPrompt=(s,prefix='')=>{s.stage='nationalId';return prompt(s,prefix+'הקישו תעודת זהות בת 9 ספרות כולל אפסים מובילים. להרשמה חדשה הקישו 0 וסולמית.',1,9)};
const passPrompt=(s,prefix='')=>{s.stage='password';return prompt(s,prefix+'הקישו את הסיסמה ובסיום סולמית. אם שכחתם את הסיסמה, הקישו כוכבית וסולמית.',1,12)};
const regPassPrompt=(s,prefix='')=>{s.stage='regPass';return prompt(s,prefix+'בחרו סיסמה של 4 עד 12 ספרות ובסיום סולמית.',4,12)};
const NO_INPUT_STAGES=new Set(['nationalId','unknownId','password','regId','regPass','regPass2','menu','examSelect','answer','benefitSelect','quantity','confirm','orderSelect','cancelConfirm','recordRetry','phoneConfirm','msgplay']);
async function advance(db,s,input,params={}){
 if(NO_INPUT_STAGES.has(s.stage)&&NONE(input)){
  s.miss=(s.miss||0)+1;
  if(s.stage==='answer'&&s.miss>=3)return menu(s,'המבחן נשמר. אפשר להמשיך בשיחה הבאה.');
  if(s.miss>=3){s.stage='done';return finish('נשמח לשמוע ממך שוב. להתראות.')}
  return again(s,s.stage==='answer'?'לא נקלטה תשובה. השאלה תושמע שוב. ':'לא נקלטה הקשה. ');
 }
 const wrong=()=>{s.miss=(s.miss||0)+1;if(s.miss>=3&&!s.pid){s.stage='done';return finish('לא הצלחנו לזהות את ההקשה. אפשר להתקשר שוב בכל עת. להתראות.')}return null};
 if(s.stage==='nationalId'){
  if(input==='0'){s.miss=0;s.stage='regId';return prompt(s,'הרשמה חדשה. הקישו את תעודת הזהות שלכם, 9 ספרות כולל אפסים מובילים.',9,9)}
  if(!/^\d{9}$/.test(input))return wrong()||loginPrompt(s,'תעודת הזהות צריכה להכיל 9 ספרות. ');
  s.miss=0;s.nationalId=input;
  if(!(await first(db,'SELECT id FROM participants WHERE nationalId=?',input))){s.stage='unknownId';return prompt(s,'תעודת הזהות '+say(input)+' עוד לא רשומה במערכת. להרשמה הקישו 1. להקשה מחדש הקישו 2.')}
  return passPrompt(s);
 }
 if(s.stage==='unknownId'){
  if(input==='1'){s.miss=0;if(!validId(s.nationalId)){s.stage='regId';delete s.nationalId;return prompt(s,'נראה שיש טעות במספר תעודת הזהות. הקישו אותה שוב, 9 ספרות.',9,9)}s.regId=s.nationalId;delete s.nationalId;return regPassPrompt(s,'הרשמה חדשה. ')}
  if(input==='2'){s.miss=0;delete s.nationalId;return loginPrompt(s)}
  return wrong()||again(s,'המקש הזה לא קיים כאן. ');
 }
 if(s.stage==='password'){
  const p=await first(db,'SELECT id,name FROM participants WHERE nationalId=?',s.nationalId);
  if(input==='*'||input==='*#'){
   if(p)await D.addMessage(db,p.id,{subject:'בקשת איפוס סיסמה',body:'הבחור ביקש בטלפון לאפס את הסיסמה.'});
   s.stage='done';return finish('בקשת איפוס הסיסמה נשלחה לצוות. הצוות יטפל בה בהקדם, ואז תוכלו להיכנס שוב. להתראות.');
  }
  try{const auth=await D.login(db,s.nationalId,input);s.pid=auth.participant.id;delete s.nationalId;s.miss=0;return greet(db,s,auth.participant.name)}
  catch(e){
   if(e.status===429||e.status===403){s.stage='done';return finish((e.status===403?'החשבון חסום. לבירור יש לפנות לצוות':e.message)+'. להתראות.')}
   if(!(e instanceof D.DomainError))throw e;
   return wrong()||passPrompt(s,'הסיסמה שגויה. נסו שוב. ');
  }
 }
 if(s.stage==='regId'){
  if(!validId(input))return wrong()||prompt(s,(/^\d{9}$/.test(input)?'נראה שיש טעות במספר. ':'תעודת הזהות צריכה להכיל 9 ספרות. ')+'הקישו שוב, 9 ספרות כולל אפסים מובילים.',9,9);
  s.miss=0;
  if(await first(db,'SELECT id FROM participants WHERE nationalId=?',input)){s.nationalId=input;return passPrompt(s,'תעודת הזהות הזו כבר רשומה. ')}
  s.regId=input;return regPassPrompt(s);
 }
 if(s.stage==='regPass'){
  if(!/^\d{4,12}$/.test(input))return wrong()||regPassPrompt(s,'הסיסמה צריכה להכיל 4 עד 12 ספרות. ');
  s.miss=0;s.regHash=await D.hashPassword(input);s.stage='regPass2';return prompt(s,'הקישו שוב את הסיסמה לאימות ובסיום סולמית.',4,12);
 }
 if(s.stage==='regPass2'){
  const salt=s.regHash.split(':')[0];
  if(s.regHash!==salt+':'+await D.derive(input,salt)){delete s.regHash;return wrong()||regPassPrompt(s,'הסיסמאות אינן תואמות. ')}
  await D.register(db,{nationalId:s.regId,name:'נרשם בטלפון',password:input});
  const auth=await D.login(db,s.regId,input);delete s.regHash;delete s.regId;s.pid=auth.participant.id;s.expires=Date.now()+30*60000;s.miss=0;
  const phone=String(params.PBXphone||'');
  if(/^0\d{8,9}$/.test(phone)&&!/^0+$/.test(phone)){s.phone=phone;s.stage='phoneConfirm';return prompt(s,'נרשמתם בהצלחה. כדי שתוכלו לשחזר סיסמה, נשמור מספר טלפון. האם המספר שממנו התקשרתם, '+say(phone)+', שלכם? לאישור הקישו 1. למספר אחר הקישו 2.')}
  s.stage='regPhone';return prompt(s,'נרשמתם בהצלחה. כדי שתוכלו לשחזר סיסמה, הקישו מספר טלפון ובסיום סולמית. לדילוג הקישו סולמית.',1,10);
 }
 if(s.stage==='phoneConfirm'){
  if(input==='1'){await statement(db,'UPDATE participants SET recoveryPhone=? WHERE id=?',s.phone,s.pid).run();return startRecord(s,'regVoice','טלפון השחזור נשמר. לאחר הצליל אמרו את שמכם המלא ואת שם הישיבה שבה אתם לומדים, ובסיום הקישו סולמית.',20,1)}
  s.stage='regPhone';return prompt(s,'הקישו את מספר הטלפון ובסיום סולמית. לדילוג הקישו סולמית.',1,10);
 }
 if(s.stage==='regPhone'){
  let note='';
  if(/^0\d{8,9}$/.test(input)){await statement(db,'UPDATE participants SET recoveryPhone=? WHERE id=?',input,s.pid).run();note='טלפון השחזור נשמר. '}
  else if(!NONE(input)){if(!s.phoneRetry){s.phoneRetry=1;return prompt(s,'המספר אינו תקין. הקישו מספר טלפון מלא, למשל 05 ועוד 8 ספרות, ובסיום סולמית. לדילוג הקישו סולמית.',1,10)}note='המספר אינו תקין ולא נשמר. אפשר לעדכן אותו מול הצוות. '}
  return startRecord(s,'regVoice',note+'לאחר הצליל אמרו את שמכם המלא ואת שם הישיבה שבה אתם לומדים, ובסיום הקישו סולמית.',20,1);
 }
 if(s.stage==='regVoice'){
  const fileId=params['FILEID_'+s.field];
  if(fileId){await statement(db,'UPDATE participants SET regAudioKey=? WHERE id=?','technoline:'+fileId,s.pid).run();STT.transcribeRegistration(db,s.pid,fileId)}
  else if(!s.voiceRetry){s.voiceRetry=1;return startRecord(s,'regVoice','לא שמענו. לאחר הצליל אמרו שוב את שמכם המלא ואת שם הישיבה, ובסיום הקישו סולמית.',20,1)}
  return menu(s,'ההרשמה הושלמה. מעכשיו נכנסים עם תעודת הזהות והסיסמה שבחרתם.');
 }
 if(!s.pid){s.stage='done';return finish('יש להתקשר מחדש ולהזדהות.')}
 const state=await D.participantState(db,s.pid);
 if(state.participant.blocked){s.stage='done';return finish('החשבון חסום. לבירור יש לפנות לצוות. להתראות.')}
 if(s.stage==='menu'){
  s.miss=0;
  if(input==='9'){s.stage='done';return finish('תודה ולהתראות.')}
  if(input==='0')return menu(s,'');
  if(input==='2'){const p=state.participant;return menu(s,Number(p.debt)>0?'יש לך חוב של '+p.debt+' נקודות. הוא יקוזז מהנקודות שתצבור במבחנים הבאים.':'יש לך '+p.balance+' נקודות.')}
  if(input==='1'){s.examPage=0;return examList(db,s,state)}
  if(input==='3'){s.page=0;return benefitList(s,state)}
  if(input==='4'){s.orderPage=0;return orderList(s,state)}
  if(input==='5'){
   const list=await D.rows(db,"SELECT id,heardAt FROM messages WHERE participantId=? AND (reply<>'' OR replyAudioKey IS NOT NULL) AND (expiresAt IS NULL OR expiresAt>?) ORDER BY createdAt DESC LIMIT 30",s.pid,D.now());
   if(!list.length)return menu(s,'אין הודעות מהצוות.');
   const fresh=list.filter(m=>!m.heardAt);s.stage='msgplay';s.items=(fresh.length?fresh:list).map(m=>m.id);s.idx=0;
   return playMsg(db,s,fresh.length?(fresh.length===1?'יש לך הודעה חדשה אחת. ':'יש לך '+fresh.length+' הודעות חדשות. '):'אין הודעות חדשות. אלו ההודעות הקודמות. ');
  }
  if(input==='6'){
   const recent=await first(db,'SELECT COUNT(*) AS n FROM messages WHERE participantId=? AND audioKey IS NOT NULL AND createdAt>?',s.pid,new Date(Date.now()-864e5).toISOString());
   if(Number(recent?.n)>=2)return menu(s,'ניתן להשאיר עד 2 הודעות ביממה. נסו שוב מחר.');
   s.replySubject='הודעה קולית מהטלפון';
   return startRecord(s,'record','השאירו הודעה לצוות לאחר הצליל, עד 30 שניות. בסיום הקישו סולמית.');
  }
  return menu(s,'המקש הזה לא קיים כאן.');
 }
 if(s.stage==='record'){
  const fileId=params['FILEID_'+s.field];
  if(!fileId){s.stage='recordRetry';return prompt(s,'ההקלטה לא נקלטה. לניסיון נוסף הקישו 1. לתפריט הראשי הקישו 0.')}
  const mid=await D.addMessage(db,s.pid,{subject:s.replySubject||'הודעה קולית מהטלפון',audioKey:'technoline:'+fileId});
  if(mid)STT.transcribeMessage(db,mid,fileId);
  return menu(s,'ההודעה נשמרה. כשהצוות יענה, התשובה תחכה לך במקש 5.');
 }
 if(s.stage==='recordRetry'){
  if(input==='1')return startRecord(s,'record','השאירו הודעה לצוות לאחר הצליל, עד 30 שניות. בסיום הקישו סולמית.');
  return menu(s,'');
 }
 if(s.stage==='msgplay'){
  if(['0','1','2','3','6'].includes(input))s.miss=0;
  await statement(db,'UPDATE messages SET heardAt=? WHERE id=? AND heardAt IS NULL',D.now(),s.items[s.idx]).run();
  if(input==='0')return menu(s,'');
  if(input==='1')return playMsg(db,s);
  if(input==='3'){s.idx=Math.max(0,s.idx-1);return playMsg(db,s)}
  if(input==='6'){
   const m=await first(db,'SELECT subject FROM messages WHERE id=?',s.items[s.idx]);
   const recent=await first(db,'SELECT COUNT(*) AS n FROM messages WHERE participantId=? AND audioKey IS NOT NULL AND createdAt>?',s.pid,new Date(Date.now()-864e5).toISOString());
   if(Number(recent?.n)>=2)return menu(s,'ניתן להשאיר עד 2 הודעות ביממה. נסו שוב מחר.');
   s.replySubject='תגובה להודעה: '+(m?.subject||'הודעה מהצוות');
   return startRecord(s,'record','השאירו תגובה לאחר הצליל, עד 30 שניות. בסיום הקישו סולמית.');
  }
  if(input!=='2')return again(s,'המקש הזה לא קיים כאן. ');
  if(s.idx+1>=s.items.length)return menu(s,'אלו כל ההודעות.');
  s.idx++;return playMsg(db,s);
 }
 if(s.stage==='examSelect'){
  if(input==='0')return menu(s,'');
  if(input==='9'&&s.examMore){s.examPage++;return examList(db,s,state)}
  if(input==='*'&&s.examPage){s.examPage--;return examList(db,s,state)}
  const eid=s.items[Number(input)-1];if(!eid)return examList(db,s,state,'המקש הזה לא קיים כאן. ');
  s.miss=0;return openExam(db,s,eid);
 }
 if(s.stage==='answer'){
  if(input==='*'){s.miss=0;return menu(s,'המבחן נשמר. אפשר להמשיך בו מתי שתרצו.')}
  if(input==='0'){s.miss=0;return question(db,s,await reloadAttempt(db,s))}
  if(!/^[1-9]$/.test(input)||Number(input)>s.optionCount)return question(db,s,await reloadAttempt(db,s),'יש להקיש מספר בין 1 ל-'+s.optionCount+'. ');
  s.miss=0;
  const a=await D.answerQuestion(db,s.pid,s.attemptId,s.questionId,Number(input)-1);let pre='';if(a.settings?.feedback){const x=await first(db,'SELECT points FROM answers WHERE attemptId=? AND questionId=?',s.attemptId,s.questionId);pre=Number(x?.points)>0?'תשובה נכונה. ':'תשובה לא נכונה. '}return question(db,s,a,pre);
 }
 if(s.stage==='benefitSelect'){
  if(input==='0')return menu(s,'');
  if(input==='*'&&s.page){s.page--;return benefitList(s,state)}
  if(input==='9'&&s.more){s.page=(s.page||0)+1;return benefitList(s,state)}
  const bid=s.items[Number(input)-1];const b=state.benefits.find(x=>x.id===bid);if(!b)return benefitList(s,state,'המקש הזה לא קיים כאן. ');
  s.miss=0;const max=Math.floor(state.participant.balance/b.cost);
  if(max<1)return benefitList(s,state,'אין לך מספיק נקודות להטבה הזו. היא עולה '+b.cost+' נקודות, ויש לך '+state.participant.balance+'. ');
  s.benefitId=bid;s.maxQty=max;s.stage='quantity';return prompt(s,'בחרת '+b.title+'. יש לך נקודות לעד '+max+' יחידות. הקישו כמות ובסיום סולמית. לחזרה הקישו 0 וסולמית.',1,5);
 }
 if(s.stage==='quantity'){
  const b=state.benefits.find(x=>x.id===s.benefitId);if(!b)return menu(s,'ההטבה נסגרה להזמנה.');
  if(input==='0')return benefitList(s,state);
  const n=Number(input),max=Math.floor(state.participant.balance/b.cost);
  if(!/^\d+$/.test(input)||n<1)return again(s,'הכמות אינה תקינה. ');
  if(n>max)return prompt(s,'אין מספיק נקודות ל-'+n+' יחידות. אפשר עד '+max+'. הקישו כמות ובסיום סולמית. לחזרה הקישו 0 וסולמית.',1,5);
  s.miss=0;s.quantity=n;s.stage='confirm';s.orderKey='technoline:'+s.callHash+':'+token();
  return prompt(s,'הזמנת '+n+' יחידות של '+b.title+'. סך הכול '+n*b.cost+' נקודות. לאישור וניכוי הנקודות הקישו 1. לביטול הקישו 2.');
 }
 if(s.stage==='confirm'){
  if(input==='2')return menu(s,'ההזמנה לא בוצעה.');
  if(input!=='1')return again(s,'המקש הזה לא קיים כאן. ');
  const o=await D.placeOrder(db,s.pid,s.benefitId,s.quantity,s.orderKey),p=await D.getParticipant(db,s.pid);
  return menu(s,'ההזמנה נקלטה. נוכו '+o.total+' נקודות. היתרה שלך עכשיו '+p.balance+' נקודות. את פרטי ההזמנה אפשר לשמוע במקש 4.');
 }
 if(s.stage==='orderSelect'){
  if(input==='0')return menu(s,'');
  if(input==='9'&&s.orderMore){s.orderPage++;return orderList(s,state)}
  if(input==='*'&&s.orderPage){s.orderPage--;return orderList(s,state)}
  const oid=s.items[Number(input)-1],o=state.orders.find(o=>o.id===oid);if(!o)return orderList(s,state,'המקש הזה לא קיים כאן. ');
  s.miss=0;const b=JSON.parse(o.snapshot),canCancel=o.status==='pending'&&!o.exportedAt&&b.closesAt>D.now();
  const info='הזמנה של '+b.title+', בכמות '+o.quantity+', סך הכול '+o.total+' נקודות. מצב ההזמנה: '+ORDER_STATUS(o)+'. החנות תוכל לאתר אותה לפי תעודת הזהות שלך. ';
  if(!canCancel)return orderList(s,state,info+'את ההזמנה הזו כבר אי אפשר לבטל. לבירור השאירו הודעה לצוות במקש 6 בתפריט הראשי. ');
  s.orderId=oid;s.stage='cancelConfirm';
  return prompt(s,info+'לבקשת ביטול וזיכוי הקישו 1. לחזרה הקישו 2.');
 }
 if(s.stage==='cancelConfirm'){
  if(input==='1'){await D.cancelOrder(db,s.pid,s.orderId,s.pid);const p=await D.getParticipant(db,s.pid);return menu(s,'ההזמנה בוטלה והנקודות הוחזרו. היתרה שלך עכשיו '+p.balance+' נקודות.')}
  if(input==='2')return orderList(s,state);
  return again(s,'המקש הזה לא קיים כאן. ');
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
  loginPrompt(state,'ברוכים הבאים לטעמו וראו. ');
 }else if(state.field&&Object.hasOwn(params,state.field)){
  try{state.response=await advance(db,state,String(params[state.field]),params);}
  catch(e){if(!(e instanceof D.DomainError))console.error('ivr',state.stage,e);state.response=state.pid?menu(state,e instanceof D.DomainError?e.message+'.':'אירעה תקלה. מה שעשית עד עכשיו נשמר. נסו שוב בעוד כמה דקות.'):loginPrompt(state,'אירעה תקלה. ');}
 }
 const response=state.response||menu(state);
 // Named inputs can be resent by paramsMode=chain. Remove them from subsequent callbacks.
 const result={...response,removeParams:Object.keys(params).filter(k=>k.startsWith('tv_')&&k!=='tv_done')};
 await statement(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(state)).run();
 return result;
}
