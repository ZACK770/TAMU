import {test} from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {postgresAdapter} from '../scripts/postgres-adapter.mjs';
import * as D from '../lib/domain.mjs';
import * as Y from '../lib/youth.mjs';
const url=process.env.TEST_DATABASE_URL;
test('domain flows on Postgres',{skip:!url},async()=>{
 const schema='t_'+crypto.randomUUID().replaceAll('-','').slice(0,12),ssl={rejectUnauthorized:false};
 const admin=new pg.Client({connectionString:url,ssl});await admin.connect();await admin.query('CREATE SCHEMA '+schema);
 const u=new URL(url);u.searchParams.set('options','-c search_path='+schema);
 const x=await postgresAdapter(u.toString(),{ssl});
 try{
  const p=await D.register(x.db,{nationalId:'012345678',name:'בדיקה',password:'123456'});
  await assert.rejects(D.register(x.db,{nationalId:'012345678',name:'שוב',password:'123456'}),/כבר רשומה/);
  const auth=await D.login(x.db,'012345678','123456');assert.equal(auth.participant.nationalId,'012345678');
  await assert.rejects(D.login(x.db,'012345678','999999'),/שגויים/);
  await D.adjustPoints(x.db,p.id,100,'פתיחה','admin','k1');await D.adjustPoints(x.db,p.id,100,'פתיחה','admin','k1');
  await assert.rejects(D.adjustPoints(x.db,p.id,-500,'הפחתה','admin','k2'),/מינוס/);
  const t=Date.now(),iso=d=>new Date(t+d).toISOString();
  const b=await D.saveBenefit(x.db,{title:'מנה',merchant:'חנות',kind:'meal',cost:30,opensAt:iso(-6e4),closesAt:iso(6e5),redeemUntil:iso(9e5)},'admin');
  const o=await D.placeOrder(x.db,p.id,b.id,2,'r1');assert.equal((await D.placeOrder(x.db,p.id,b.id,2,'r1')).id,o.id);
  assert.equal((await D.getParticipant(x.db,p.id)).balance,40);
  await assert.rejects(D.placeOrder(x.db,p.id,b.id,2,'r2'),/מספיק/);
  await D.cancelOrder(x.db,p.id,o.id,p.id);assert.equal((await D.getParticipant(x.db,p.id)).balance,100);
  const questions=[1,2,3].map(i=>({id:'q'+i,text:'שאלה '+i,options:['א','ב'],correct:0,points:5}));
  const e=await D.saveExam(x.db,{title:'מבחן',materialKey:'m1',week:'w1',track:'easy',kind:'sicha',opensAt:iso(-6e4),closesAt:iso(6e5),questionCount:2,questions,published:true},'admin');
  let a=await D.startAttempt(x.db,p.id,e.id);
  while(!a.completed)a=await D.answerQuestion(x.db,p.id,a.id,a.question.id,0);
  assert.equal(a.score,10);assert.equal((await D.getParticipant(x.db,p.id)).balance,110);
  assert.equal((await D.startAttempt(x.db,p.id,e.id)).completed,true);
  await assert.rejects(x.db.prepare('DELETE FROM ledger').bind().run(),/ledger_immutable/);
  const yu=await Y.registerYouth(x.db,{username:'noam_1',name:'נועם',password:'abcdefgh'});
  assert.ok((await Y.loginYouth(x.db,'noam_1','abcdefgh')).token);
  assert.equal((await x.db.prepare('SELECT COUNT(*) AS total FROM participants').bind().first()).total,1);
 }finally{await x.close();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end()}
});
