import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../lib/domain.mjs';
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./fixtures/schema.sql',import.meta.url),'utf8'));
 const db={
  prepare(query){
   return {bind(...a){
    return {
     async first(){return sql.prepare(query).get(...a)||null;},
     async all(){return {results:sql.prepare(query).all(...a)};},
     async run(){return {meta:sql.prepare(query).run(...a)};}
    };
   }};
  },
  async batch(ss){
   sql.exec('BEGIN IMMEDIATE');
   try{const out=[];for(const s of ss)out.push(await s.run());sql.exec('COMMIT');return out;}
   catch(e){sql.exec('ROLLBACK');throw e;}
  }
 };return {sql,db};
}
const register=(db,nationalId='000000001')=>D.register(db,{nationalId,name:'Test participant',password:'123456'});
const exam=(db,extra={})=>D.saveExam(db,{title:'Test exam',materialKey:'m1',week:'w1',track:'easy',kind:'sicha',opensAt:new Date(Date.now()-3600000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),questionCount:2,questions:[{id:'q1',text:'Q1',options:['yes','no'],correct:0,points:10},{id:'q2',text:'Q2',options:['yes','no'],correct:0,points:20},{id:'q3',text:'Q3',options:['yes','no'],correct:0,points:30}],published:true,...extra},'admin');
const benefit=(db,extra={})=>D.saveBenefit(db,{title:'Meal',merchant:'Test shop',kind:'meal',cost:20,opensAt:new Date(Date.now()-3600000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),redeemUntil:new Date(Date.now()+172800000).toISOString(),...extra},'admin');
test('stable draw and resume; immutable answers; only one final credit',async()=>{
 const {db,sql}=setup(),p=await register(db),e=await exam(db);const a=await D.startAttempt(db,p.id,e.id),a2=await D.startAttempt(db,p.id,e.id);assert.deepEqual(a,a2);assert.equal(a.question.correct,undefined);
 const n=await D.answerQuestion(db,p.id,a.id,a.question.id,0);assert.equal((await D.getParticipant(db,p.id)).balance,0);assert.equal(n.answered,1);
 assert.equal((await D.startAttempt(db,p.id,e.id)).question.id,n.question.id);
 await assert.rejects(D.answerQuestion(db,p.id,a.id,a.question.id,1));
 const end=await D.answerQuestion(db,p.id,a.id,n.question.id,0);assert.equal(end.completed,true);await D.answerQuestion(db,p.id,a.id,n.question.id,0);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM ledger').get().n,1);assert.equal((await D.getParticipant(db,p.id)).balance,end.score);
});
test('duplicate material exam blocked; role track change deferred',async()=>{const {db}=setup(),p=await register(db),a=await exam(db),b=await exam(db);await D.startAttempt(db,p.id,a.id);await assert.rejects(D.startAttempt(db,p.id,b.id));await D.changeTrack(db,p.id,'challenging','admin');const saved=await D.getParticipant(db,p.id);assert.equal(D.effectiveTrack(saved),'easy');assert.equal(D.effectiveTrack(saved,saved.trackEffective),'challenging');});
test('atomic debit and idempotency; insufficient balance rejected',async()=>{const {db,sql}=setup(),p=await register(db),b=await benefit(db);await D.adjustPoints(db,p.id,30,'opening','admin','open');const o=await D.placeOrder(db,p.id,b.id,1,'o1');assert.equal((await D.placeOrder(db,p.id,b.id,1,'o1')).id,o.id);assert.equal((await D.getParticipant(db,p.id)).balance,10);await assert.rejects(D.placeOrder(db,p.id,b.id,1,'o2'));assert.equal(sql.prepare('SELECT COUNT(*) n FROM orders').get().n,1);});
test('cancel refunds once, export locks cancellation, delivery cannot repeat',async()=>{const {db}=setup(),p=await register(db),b=await benefit(db);await D.adjustPoints(db,p.id,100,'opening','admin','open');const a=await D.placeOrder(db,p.id,b.id,2,'o1');await D.cancelOrder(db,p.id,a.id,p.id);await D.cancelOrder(db,p.id,a.id,p.id);assert.equal((await D.getParticipant(db,p.id)).balance,100);const o=await D.placeOrder(db,p.id,b.id,1,'o2');await D.orderTransition(db,o.id,'export','admin');await assert.rejects(D.cancelOrder(db,p.id,o.id,p.id));await assert.rejects(D.orderTransition(db,o.id,'complete','merchant','Wrong shop'));await D.orderTransition(db,o.id,'complete','merchant','Test shop');await assert.rejects(D.orderTransition(db,o.id,'complete','merchant','Test shop'));});
test('shared card requires admin approval; retry does not charge twice',async()=>{const {db}=setup(),p=await register(db),p2=await register(db,'000000002');await D.linkCard(db,p.id,'Books','123456789',p.id);await assert.rejects(D.linkCard(db,p2.id,'Books','123456789',p2.id));await D.linkCard(db,p2.id,'Books','123456789','admin',true);const b=await benefit(db,{kind:'card',merchant:'Books',faceValue:50});await D.adjustPoints(db,p.id,100,'opening','admin','open');const o=await D.placeOrder(db,p.id,b.id,1,'o1');for(const action of ['export','fail','retry'])await D.orderTransition(db,o.id,action,'admin');assert.equal((await D.getParticipant(db,p.id)).balance,80);});
test('passwords and tokens hashed; login throttled; ledger immutable',async()=>{const {db,sql}=setup(),p=await register(db);assert.equal(p.passwordHash,undefined);const s=await D.login(db,'000000001','123456');assert.notEqual(sql.prepare('SELECT tokenHash FROM sessions').get().tokenHash,s.token);for(let i=0;i<5;i++)await assert.rejects(D.login(db,'000000001','999999'));await assert.rejects(D.login(db,'000000001','123456'));await D.adjustPoints(db,p.id,10,'opening','admin','open');await assert.rejects(D.adjustPoints(db,p.id,-20,'bad','admin','bad'));assert.equal((await D.getParticipant(db,p.id)).balance,10);assert.throws(()=>sql.exec('DELETE FROM ledger'));});
test('bonus questions drawn separately; bonus flag exposed; pool validated',async()=>{
 const {db}=setup(),p=await register(db),qs=[1,2,3].map(i=>({id:'r'+i,text:'R'+i,options:['a','b'],correct:0,points:2})).concat([{id:'b1',text:'B',options:['a','b'],correct:0,points:5,bonus:true}]);
 await assert.rejects(exam(db,{questionCount:2,bonusCount:2,questions:qs}));
 const e=await exam(db,{questionCount:2,bonusCount:1,questions:qs});let a=await D.startAttempt(db,p.id,e.id);assert.equal(a.total,3);
 for(let i=0;i<2;i++){assert.equal(a.question.bonus,false);a=await D.answerQuestion(db,p.id,a.id,a.question.id,0)}
 assert.equal(a.question.id,'b1');assert.equal(a.question.bonus,true);const end=await D.answerQuestion(db,p.id,a.id,'b1',0);assert.equal(end.score,9);
});
