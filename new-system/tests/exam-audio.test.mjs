import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../lib/domain.mjs';
import {handleTechnolineCall} from '../lib/technoline.mjs';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';
import {uploadAudioQueue,parseTextQuestions,audioQuestion,audioExtension,resizeOptions,moveQuestion,questionErrors,MAX_AUDIO_BYTES} from '../public/admin/exam-questions.mjs';
function setup(){const x=sqliteAdapter(':memory:');x.sql.exec(readFileSync(new URL('./fixtures/schema.sql',import.meta.url),'utf8'));return x}
async function session(db){const p=await D.register(db,{nationalId:'123456782',name:'Test',password:'1234'});let last;const call=async value=>{const params={PBXcallId:crypto.randomUUID()};params.PBXcallId=p.id;if(last&&value!==undefined)params[last.name]=value;last=await handleTechnolineCall(db,params);return last};await call();await call('123456782');await call('1234');return {p,call}}
const exam=(db,extra={})=>D.saveExam(db,{title:'Exam',materialKey:crypto.randomUUID(),week:'w',track:'easy',kind:'sicha',opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),published:true,questionCount:1,bonusCount:0,questions:[{id:'q1',text:'Question',options:['a','b','c','d'],correct:2,points:10,audioKey:'tl:12345:q-123',audioIncludesOptions:true}],...extra},'admin');
const benefit=db=>D.saveBenefit(db,{title:'Benefit',merchant:'Shop',kind:'meal',cost:10,opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),redeemUntil:new Date(Date.now()+172800000).toISOString()},'admin');
const spoken=r=>r.files.filter(f=>f.text).map(f=>f.text).join(' ');
test('recorded question preserves audio and does not repeat options after silence or zero',async()=>{
 const {db}=setup(),{call}=await session(db);await exam(db);
 let r=await call('1');assert.equal(r.files.filter(f=>f.fileId==='12345').length,1);assert.doesNotMatch(spoken(r),/לתשובה/);
 r=await call('ERROR');assert.equal(r.files.filter(f=>f.fileId==='12345').length,1);
 r=await call('ERROR');assert.equal(r.files.filter(f=>f.fileId==='12345').length,1);assert.equal((spoken(r).match(/לא נקלטה תשובה/g)||[]).length,1);
 r=await call('0');assert.equal(r.files.filter(f=>f.fileId==='12345').length,1);
});
test('ordinary question-only audio still reads text options',async()=>{
 const {db}=setup(),{call}=await session(db);await exam(db,{questions:[{id:'q1',text:'Question',options:['yes','no'],correct:0,points:10,audioKey:'tl:12345:q-123'}]});
 const r=await call('1');assert.match(spoken(r),/לתשובה yes/);assert.equal(r.files[1].fileId,'12345');
});
test('unknown key and silence keep the current staff message',async()=>{
 const {db,sql}=setup(),{call,p}=await session(db);
 for(const id of ['m1','m2']){await D.addMessage(db,p.id,{subject:id,body:'request'});}
 sql.prepare("UPDATE messages SET reply='Staff answer'").run();
 let r=await call('5');const first=spoken(r);r=await call('7');assert.match(spoken(r),/המקש הזה לא קיים כאן/);assert.ok(spoken(r).includes(first));
 r=await call('ERROR');assert.ok(spoken(r).includes('Staff answer'));assert.doesNotMatch(spoken(r),/אלו כל ההודעות/);
});
test('exported order is awaiting redemption, completed order is redeemed',async()=>{
 const {db}=setup(),{call,p}=await session(db),b=await benefit(db);await D.adjustPoints(db,p.id,30,'opening','admin','open');const o=await D.placeOrder(db,p.id,b.id,1,'o');await D.orderTransition(db,o.id,'export','admin');
 let r=await call('4');assert.match(spoken(r),/הועברה לחנות וממתינה למימוש/);assert.doesNotMatch(spoken(r),/טופלה/);
 await call('0');await D.orderTransition(db,o.id,'complete','admin');r=await call('4');assert.match(spoken(r),/מומשה/);
});
test('balance prompt includes separate debt',async()=>{
 const {db}=setup(),{call,p}=await session(db);await D.adjustPoints(db,p.id,-20,'adjust','admin','debt','debt');const r=await call('2');assert.match(spoken(r),/חוב של 20/);
});
test('completed exam uses credited points and respects hidden points',async()=>{
 const {db}=setup(),{call,p}=await session(db),e=await exam(db,{settings:{fixedPoints:50}});
 let a=await D.startAttempt(db,p.id,e.id);a=await D.answerQuestion(db,p.id,a.id,a.question.id,2);assert.equal(a.score,10);assert.equal(a.awarded,50);
 let r=await call('1');assert.match(spoken(r),/50 נקודות/);assert.doesNotMatch(spoken(r),/10 נקודות/);
});
test('exam pagination offers the ninth exam and a previous page',async()=>{
 const {db}=setup(),{call}=await session(db);for(let i=1;i<=10;i++)await exam(db,{title:'Exam '+i});
 let r=await call('1');assert.match(spoken(r),/למבחנים נוספים הקישו 9/);r=await call('9');assert.match(spoken(r),/לעמוד הקודם/);
 r=await call('*');assert.match(spoken(r),/למבחנים נוספים/);
});
test('orders paginate beyond eight and can return to previous page',async()=>{
 const {db}=setup(),{call,p}=await session(db),b=await benefit(db);await D.adjustPoints(db,p.id,200,'opening','admin','open');for(let i=0;i<10;i++)await D.placeOrder(db,p.id,b.id,1,'o'+i);
 let r=await call('4');assert.match(spoken(r),/להזמנות נוספות/);r=await call('9');assert.match(spoken(r),/לעמוד הקודם/);r=await call('*');assert.match(spoken(r),/להזמנות נוספות/);
});
test('recorded bank preserves insertion order, explicit correct answer and movement',()=>{
 const qs=['third.mp3','first.mp3','second.mp3'].map((name,i)=>audioQuestion({name},'q'+i));
 assert.deepEqual(qs.map(q=>q.sourceName),['third.mp3','first.mp3','second.mp3']);assert.ok(qs.every(q=>q.correct===-1));
 moveQuestion(qs,2,-1);assert.deepEqual(qs.map(q=>q.id),['q0','q2','q1']);qs[0].correct=3;resizeOptions(qs[0],2);assert.equal(qs[0].correct,-1);assert.equal(qs[0].options.length,2);
 assert.ok(questionErrors(qs).some(e=>e.includes('בחרו תשובה נכונה')));
});
test('audio upload validates file limits and types',()=>{
 assert.equal(audioExtension({name:'QUESTION.MP3',size:100}),'mp3');assert.throws(()=>audioExtension({name:'bad.exe',size:100}));
 assert.throws(()=>audioExtension({name:'empty.wav',size:0}));assert.throws(()=>audioExtension({name:'big.mp3',size:MAX_AUDIO_BYTES+1}));
});
test('audio-inclusive option requires uploaded audio and survives exam snapshot',async()=>{
 const {db}=setup(),{p}=await session(db);await assert.rejects(exam(db,{questions:[{id:'q',text:'Q',options:['1','2'],correct:0,points:1,audioIncludesOptions:true}]}),/דרוש קובץ שמע/);
 const e=await exam(db);const a=await D.startAttempt(db,p.id,e.id);assert.equal(a.question.audioIncludesOptions,true);assert.equal(a.question.correct,undefined);
});

test('text import remains independent of DOM and preserves correct answers',()=>{
 const qs=parseTextQuestions('First\n*Yes\nNo\n\nSecond\nA\n*B');
 assert.equal(qs.length,2);assert.equal(qs[0].correct,0);assert.equal(qs[1].correct,1);assert.deepEqual(qs[0].options,['Yes','No']);assert.equal(parseTextQuestions('').length,0);
});

test('batch uploads follow arranged order, keep successful files, and retry only failures',async()=>{
 const questions=['third.mp3','first.mp3','second.mp3'].map((name,i)=>audioQuestion({name},'q'+i));
 moveQuestion(questions,2,-1);const pending=new Map(questions.map(q=>[q.id,{file:{name:q.sourceName},state:'waiting'}])),seen=[];
 let active=0;const upload=async file=>{assert.equal(active,0);active++;seen.push(file.name);await Promise.resolve();active--;if(file.name==='second.mp3')throw Error('offline');return 'tl:123:q-1'};
 const result=await uploadAudioQueue(questions,pending,upload);assert.deepEqual(seen,['third.mp3','second.mp3','first.mp3']);assert.deepEqual(result,{uploaded:2,failed:1});assert.equal(pending.size,1);assert.equal(questions[1].audioKey,undefined);
 const retried=[];await uploadAudioQueue(questions,pending,async file=>{retried.push(file.name);return 'tl:456:q-2'});
 assert.deepEqual(retried,['second.mp3']);assert.equal(pending.size,0);assert.deepEqual(questions.map(q=>q.sourceName),['third.mp3','second.mp3','first.mp3']);
});
