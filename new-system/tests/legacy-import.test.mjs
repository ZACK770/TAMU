import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../lib/domain.mjs';
import {buildPlan,applyPlan} from '../lib/legacy-import.mjs';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';

const list='123456782,1,דוד,כהן,1,4321,0521111111,1,,\n123456782,1,דוד,כהן,1,9876,0521111111,1,,\n000000018,1,משה,לוי,2,1300,500000000,1,,\n12345,1,קצר,מזהה,1,1,1111,,,';
const points='list_all_information-123456782-points_total=100\nlist_all_information-123456782-Folder/1/1/1/4=20\nlist_all_information-000000018-points_total=30\nlist_all_information-999999998-points_total=5';
const adds='123456782,-40\n000000018,-50\n123456782,-40';
const logs={'points_log.2026-10.ymgr':'Folder#1/2%Type#list_all_information%id#123456782%Points#20%PointsTotal#90'};

function db(){const x=sqliteAdapter(':memory:');x.sql.exec(readFileSync(new URL('./fixtures/schema.sql',import.meta.url),'utf8'));return x.db}

test('plan sums earned and admin adjustments and flags problems without guessing',()=>{
 const p=buildPlan({list,points,adds,logs}),by=Object.fromEntries(p.participants.map(x=>[x.nationalId,x]));
 assert.equal(by['123456782'].balance,20);assert.equal(by['123456782'].passwords.length,2);
 assert.equal(by['000000018'].balance,-20);assert.equal(by['000000018'].opening,0);
 assert.equal(by['999999998'].passwords.length,0);
 const issues=p.review.map(r=>r.issue+':'+r.nationalId);
 for(const i of ['negative_balance:000000018','invalid_id:12345','no_password:999999998','log_mismatch:123456782'])assert.ok(issues.includes(i),i);
 assert.ok(!by['12345']);
});

test('apply is idempotent and legacy passwords log in once, then upgrade',async()=>{
 const d=db(),plan=buildPlan({list,points,adds,logs});
 await applyPlan(d,plan);await applyPlan(d,plan);
 const p=await d.prepare('SELECT * FROM participants WHERE nationalId=?').bind('123456782').first();
 assert.equal(p.balance,20);assert.equal(p.passwordHash,null);
 assert.equal((await d.prepare("SELECT count(*) n FROM legacy WHERE kind='points_log'").bind().first()).n,1);
 assert.equal((await d.prepare("SELECT count(*) n FROM legacy WHERE kind='password'").bind().first()).n,3);
 const debtor=await d.prepare('SELECT * FROM participants WHERE nationalId=?').bind('000000018').first();assert.equal(debtor.balance,0);assert.equal(debtor.debt,20);
 await D.adjustPoints(d,debtor.id,15,'מבחן','test','d1');await D.adjustPoints(d,debtor.id,15,'מבחן','test','d2');
 const after=await d.prepare('SELECT * FROM participants WHERE nationalId=?').bind('000000018').first();assert.equal(after.debt,0);assert.equal(after.balance,10);
 await assert.rejects(D.login(d,'123456782','1111'),/שגויים/);
 assert.ok((await D.login(d,'123456782','4321')).token);
 assert.ok((await d.prepare('SELECT passwordHash FROM participants WHERE nationalId=?').bind('123456782').first()).passwordHash);
 await assert.rejects(D.login(d,'123456782','9876'),/שגויים/);
});
