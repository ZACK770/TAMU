import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';
import * as Y from '../lib/youth.mjs';
import * as D from '../lib/domain.mjs';
import {handleYouthHttp} from '../lib/youth-http.mjs';
function fixture(){const {db,sql}=sqliteAdapter();sql.exec(readFileSync(new URL('../db/portable-schema.sql',import.meta.url),'utf8'));return {db,sql}}
const register=(db,username='young1')=>Y.registerYouth(db,{name:'Youth test',username,password:'password123'});
const exam=(db,settings={})=>Y.saveYouthExam(db,{title:'Web exam',materialKey:'web-m1',week:'web-w1',track:'easy',kind:'sicha',opensAt:new Date(Date.now()-10000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),questionCount:2,questions:[{id:'q1',text:'Q1',options:['A','B'],correct:0,points:10},{id:'q2',text:'Q2',options:['A','B'],correct:1,points:20}],published:true,webSettings:{shuffle:false,...settings},body:'Lesson',intro:'Intro'},'admin');
test('website username registration is independent of telephone accounts',async()=>{
 const {db}=fixture();const phone=await D.register(db,{name:'Phone',nationalId:'000000001',password:'123456'});const youth=await register(db);const scoped=Y.youthDb(db);
 await D.adjustPoints(db,phone.id,100,'phone credit','admin','one');await D.adjustPoints(scoped,youth.id,20,'web credit','admin','one');
 assert.equal((await D.getParticipant(db,phone.id)).balance,100);assert.equal((await D.getParticipant(scoped,youth.id)).balance,20);
 await assert.rejects(D.getParticipant(db,youth.id));await assert.rejects(D.login(db,'young1','password123'));
});
test('review mode saves drafts, allows changing answers, and awards only after final submit',async()=>{
 const {db,sql}=fixture(),p=await register(db),e=await exam(db),a=await Y.startYouthAttempt(db,p.id,e.id);
 assert.equal(a.settings.answerMode,'review');assert.equal(a.questions[0].id,'q1');assert.equal(a.questions[0].correct,undefined);
 let s=await Y.saveYouthChoice(db,p.id,a.id,'q1',1,0);assert.equal(s.revision,1);
 s=await Y.saveYouthChoice(db,p.id,a.id,'q1',0,1);assert.equal(s.choices.q1,0);
 s=await Y.saveYouthChoice(db,p.id,a.id,'q2',1,2);assert.equal((await Y.youthState(db,p.id)).participant.balance,0);
 s=await Y.submitYouthAttempt(db,p.id,a.id,3);assert.equal(s.completed,true);assert.equal(s.score,30);
 await Y.submitYouthAttempt(db,p.id,a.id,3);assert.equal((await Y.youthState(db,p.id)).participant.balance,30);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM b_ledger').get().n,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM ledger').get().n,0);
 await assert.rejects(Y.saveYouthChoice(db,p.id,a.id,'q1',1,3));
});
test('resume restores drafts; stale revisions and incomplete submission rejected',async()=>{
 const {db}=fixture(),p=await register(db),e=await exam(db),a=await Y.startYouthAttempt(db,p.id,e.id);
 await Y.saveYouthChoice(db,p.id,a.id,'q1',0,0);
 await assert.rejects(Y.saveYouthChoice(db,p.id,a.id,'q1',1,0),e=>e.status===409);
 const resumed=await Y.startYouthAttempt(db,p.id,e.id);assert.equal(resumed.id,a.id);assert.equal(resumed.choices.q1,0);
 await assert.rejects(Y.submitYouthAttempt(db,p.id,a.id,1));assert.equal((await Y.youthState(db,p.id)).participant.balance,0);
});
test('attempts and participant data cannot be read or changed by another youth account',async()=>{
 const {db}=fixture(),a=await register(db),b=await register(db,'young2'),e=await exam(db),attempt=await Y.startYouthAttempt(db,a.id,e.id);
 await assert.rejects(Y.youthAttemptView(db,b.id,attempt.id));await assert.rejects(Y.saveYouthChoice(db,b.id,attempt.id,'q1',0,0));await assert.rejects(Y.submitYouthAttempt(db,b.id,attempt.id,0));
});
test('locked mode retains telephone-like policy when selected, without changing core phone rules',async()=>{
 const {db}=fixture(),p=await register(db),e=await exam(db,{answerMode:'locked',layout:'one'}),a=await Y.startYouthAttempt(db,p.id,e.id);
 await Y.saveYouthChoice(db,p.id,a.id,'q1',0,0);await assert.rejects(Y.saveYouthChoice(db,p.id,a.id,'q1',1,0));
 const end=await Y.saveYouthChoice(db,p.id,a.id,'q2',1,0);assert.equal(end.completed,true);assert.equal(end.score,30);
});
test('youth rewards cannot spend phone points or use phone partner networks',async()=>{
 const {db}=fixture(),p=await register(db);const t={title:'Phone only',merchant:'Phone network',kind:'meal',cost:10,opensAt:new Date(Date.now()-10000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),redeemUntil:new Date(Date.now()+172800000).toISOString()};
 const phoneReward=await D.saveBenefit(db,t,'admin');await D.adjustPoints(Y.youthDb(db),p.id,30,'test','admin','one');
 await assert.rejects(Y.youthOrder(db,p.id,phoneReward.id,1,'request'));
 const webReward=await Y.saveYouthBenefit(db,{...t,title:'Youth reward',merchant:'Youth network'},'admin');
 const o=await Y.youthOrder(db,p.id,webReward.id,2,'request');assert.equal((await Y.youthState(db,p.id)).participant.balance,10);
 await Y.youthCancel(db,p.id,o.id);assert.equal((await Y.youthState(db,p.id)).participant.balance,30);
});
test('correct answers hidden before submission; revealed only if explicitly configured',async()=>{
 const {db}=fixture(),p=await register(db),e=await exam(db,{showCorrect:true});let a=await Y.startYouthAttempt(db,p.id,e.id);
 assert.equal(a.questions[0].correct,undefined);
 a=await Y.saveYouthChoice(db,p.id,a.id,'q1',0,0);a=await Y.saveYouthChoice(db,p.id,a.id,'q2',1,1);a=await Y.submitYouthAttempt(db,p.id,a.id,2);assert.equal(a.questions[0].correct,0);
});
test('HTTP session is HttpOnly, CSRF blocked, participant cannot access admin API',async()=>{
 const {db}=fixture(),origin='http://localhost:4173';
 const make=(path,method='GET',body,cookie)=>new Request(origin+'/api/youth/'+path,{method,headers:{...(method==='POST'?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const admin=async()=>{throw new D.DomainError('denied',403)};
 const r=await handleYouthHttp(db,make('register','POST',{username:'tester',name:'Test youth',password:'password123'}),'youth/register',admin);
 assert.equal(r.status,201);assert.match(r.headers.get('set-cookie'),/HttpOnly/);const cookie=r.headers.get('set-cookie').split(';')[0];
 const state=await handleYouthHttp(db,make('state','GET',undefined,cookie),'youth/state',admin);assert.equal(state.status,200);const s=await state.json();assert.equal(s.participant.username,'tester');assert.equal(s.participant.passwordHash,undefined);
 assert.equal((await handleYouthHttp(db,make('admin','GET',undefined,cookie),'youth/admin',admin)).status,403);
 const bad=new Request(origin+'/api/youth/message',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example',Cookie:cookie},body:JSON.stringify({subject:'x',body:'x'})});
 assert.equal((await handleYouthHttp(db,bad,'youth/message',admin)).status,403);
 assert.equal((await handleYouthHttp(db,make('state'),'youth/state',admin)).status,401);
});
