import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyLegacyLog,classifyLedger,pointsReport} from '../lib/points-source.mjs';
test('legacy and new movements map to the same categories',async()=>{
 assert.equal(classifyLegacyLog({Log:'Examination1/1/1/2/49',Points:'10',Folder:'1/1/1/2/49',Date:'2021-12-09',Time:'14:58:19'}).category,'exam');
 assert.equal(classifyLegacyLog({Log:'יפה נוף',Points:'-100'}).category,'card');
 assert.equal(classifyLegacyLog({Log:'שומשום',Points:'-15'}).category,'redemption');
 assert.equal(classifyLedger({reference:'exam:x',delta:12}).category,'exam');
 assert.equal(classifyLedger({reference:'order:x',delta:-5}).category,'redemption');
 assert.equal(classifyLedger({reference:'adjust:k',delta:-5}).category,'manager');
 const data={participants:[{id:'p1',nationalId:'111111118',name:'א',institution:'3'}],
  legacy:[{nationalId:'111111118',kind:'points_log',payload:JSON.stringify({Log:'Examination1/1',Points:'10',Date:'2021-01-01',Time:'10:00:00'})},{nationalId:'111111118',kind:'admin_adjustment',payload:JSON.stringify({delta:-3,line:4})}],
  ledger:[{participantId:'p1',delta:7,reference:'exam:a',reason:'מבחן',createdAt:'2026-10-25T10:00:00Z'}]};
 const db={prepare:s=>({bind:()=>({all:async()=>({results:data[s.includes('FROM participants')?'participants':s.includes('FROM legacy')?'legacy':'ledger']})})})};
 const r=await pointsReport(db,{});assert.equal(r.total,3);const ex=r.summary.find(s=>s.category==='exam');assert.equal(ex.count,2);assert.equal(ex.plus,17);assert.equal(ex.legacy,1);assert.equal(ex.new,1);
 assert.equal((await pointsReport(db,{system:'new'})).total,1);assert.equal((await pointsReport(db,{from:'2025-01-01'})).total,1);
});
