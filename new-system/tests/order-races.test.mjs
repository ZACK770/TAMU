import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';
import * as D from '../lib/domain.mjs';
async function setup(){
 const x=sqliteAdapter();x.sql.exec(readFileSync(new URL('./fixtures/schema.sql',import.meta.url),'utf8'));
 const p=await D.register(x.db,{nationalId:'123456789',name:'בדיקה',password:'123456'});
 await D.adjustPoints(x.db,p.id,200,'בדיקה','admin',crypto.randomUUID());
 const b=await D.saveBenefit(x.db,{title:'מנה',merchant:'חנות א',branch:'סניף א',kind:'meal',cost:20,opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+600000).toISOString(),redeemUntil:new Date(Date.now()+1200000).toISOString()},'admin');
 const o=await D.placeOrder(x.db,p.id,b.id,2,crypto.randomUUID());return {...x,p,o};
}
test('export between cancellation read and transaction prevents both refund and cancellation',async()=>{
 const x=await setup();let intercepted=false;
 const racing={prepare:s=>x.db.prepare(s),async batch(ss){if(!intercepted){intercepted=true;await D.orderTransition(x.db,x.o.id,'export','admin')}return x.db.batch(ss)}};
 await assert.rejects(D.cancelOrder(racing,x.p.id,x.o.id,x.p.id),e=>e.status===409);
 assert.equal((await D.getParticipant(x.db,x.p.id)).balance,160);
 assert.equal(x.sql.prepare('SELECT status FROM orders WHERE id=?').get(x.o.id).status,'exported');
 assert.equal(x.sql.prepare("SELECT COUNT(*) AS n FROM ledger WHERE reference=?").get('refund:'+x.o.id).n,0);x.close();
});
test('two merchant completions return one success and one conflict',async()=>{
 const x=await setup();const result=await Promise.allSettled([D.orderTransition(x.db,x.o.id,'complete','merchant','חנות א'),D.orderTransition(x.db,x.o.id,'complete','merchant','חנות א')]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.filter(r=>r.status==='rejected').length,1);x.close();
});
test('merchant with a different branch cannot fulfill the order',async()=>{
 const x=await setup();await assert.rejects(D.orderTransition(x.db,x.o.id,'complete','merchant',{merchant:'חנות א',branch:'סניף ב'}),e=>e.status===403);
 assert.equal(x.sql.prepare('SELECT status FROM orders WHERE id=?').get(x.o.id).status,'pending');x.close();
});
