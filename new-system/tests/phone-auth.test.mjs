import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../lib/phone-auth.mjs';
import * as D from '../lib/domain.mjs';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';
function setup(){const x=sqliteAdapter(':memory:');x.sql.exec(readFileSync(new URL('../db/portable-schema.sql',import.meta.url),'utf8'));return x}
const env={BIFNIM_OTP_WEBHOOK_URL:'https://example.invalid/otp',BIFNIM_OTP_WEBHOOK_TOKEN:'test-only',BIFNIM_OTP_SECRET:'test-only-secret-at-least-32-characters',BIFNIM_OTP_CHANNELS:'sms,whatsapp'};
async function request(db,extra={}){let sent;const result=await P.requestPhoneCode(db,{phone:'0501234567',...extra},{env,sender:async payload=>{sent=payload}});return {result,sent}}
const verify=(db,r,code=r.sent.code)=>P.verifyPhoneCode(db,{phone:r.result.phone,challengeId:r.result.challengeId,code},{env});
test('phone normalization accepts local and international forms; rejects invalid phones',()=>{
 for(const value of ['0501234567','+972501234567','972501234567','050-123 4567'])assert.equal(P.normalizePhone(value),'972501234567');
 for(const value of ['050','abc0501234567','03-1234567'])assert.throws(()=>P.normalizePhone(value));
 assert.equal(P.phoneAuthOptions({}).phone,false);
});
test('verified phone creates account without name or password and preserves account on return',async()=>{
 const {db,sql}=setup(),r=await request(db);assert.equal(r.sent.channel,'sms');assert.equal(r.sent.code.length,6);assert.equal(r.result.code,undefined);
 const a=await verify(db,r);assert.ok(a.participant.id);assert.equal(sql.prepare('SELECT passwordHash FROM b_participants').get().passwordHash,null);assert.equal(sql.prepare('SELECT COUNT(*) n FROM participants').get().n,0);
 const session=sql.prepare('SELECT * FROM b_sessions').get();assert.notEqual(session.tokenHash,a.token);
 assert.ok(Date.parse(session.expiresAt)>Date.now()+29*86400000);
 const r2=await request(db,{phone:'+972501234567',name:'Changed'});const b=await verify(db,r2);assert.equal(a.participant.id,b.participant.id);assert.equal(sql.prepare('SELECT COUNT(*) n FROM b_participants').get().n,1);
});
test('code is hashed, expires, and is consumed only once under parallel verification',async()=>{
 const {db,sql}=setup(),r=await request(db);const stored=sql.prepare('SELECT value FROM b_settings').get().value;assert.ok(!stored.includes(r.sent.code));
 const results=await Promise.allSettled([verify(db,r),verify(db,r)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);await assert.rejects(verify(db,r));
 const r2=await request(db);const row=sql.prepare('SELECT key,value FROM b_settings').get(),c=JSON.parse(row.value);c.expires=Date.now()-1;sql.prepare('UPDATE b_settings SET value=? WHERE key=?').run(JSON.stringify(c),row.key);await assert.rejects(verify(db,r2),/פג/);
});
test('wrong-code attempts have an atomic limit and resend has a cooldown',async()=>{
 const {db}=setup(),r=await request(db);await assert.rejects(request(db),/בעוד דקה/);
 const wrong=r.sent.code==='000000'?'111111':'000000';for(let i=0;i<5;i++)await assert.rejects(verify(db,r,wrong));
 await assert.rejects(verify(db,r),e=>e.status===429);
});
test('failed delivery never verifies and releases reservation for retry',async()=>{
 const {db,sql}=setup();await assert.rejects(P.requestPhoneCode(db,{phone:'0501234567'},{env,sender:async()=>{throw Error('provider unavailable')}}),e=>e.status===502);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM b_settings').get().n,0);await request(db);
});
test('parallel send requests dispatch only one code and channel allowlist is enforced',async()=>{
 const {db}=setup();const outcomes=await Promise.allSettled([request(db),request(db)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 await assert.rejects(P.requestPhoneCode(db,{phone:'0507654321',channel:'email'},{env,sender:async()=>{}}));
});
test('blocked verified account cannot receive a session',async()=>{
 const {db,sql}=setup(),r=await request(db);await verify(db,r);sql.prepare('UPDATE b_participants SET blocked=1').run();const r2=await request(db);const n=sql.prepare('SELECT COUNT(*) n FROM b_sessions').get().n;
 await assert.rejects(verify(db,r2),e=>e.status===403);assert.equal(sql.prepare('SELECT COUNT(*) n FROM b_sessions').get().n,n);
});
