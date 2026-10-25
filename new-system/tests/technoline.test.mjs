import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleTechnolineCall} from '../lib/technoline.mjs';
import {sqliteAdapter} from '../scripts/sqlite-adapter.mjs';

function db(){const x=sqliteAdapter(':memory:');x.sql.exec(readFileSync(new URL('./fixtures/schema.sql',import.meta.url),'utf8'));return x}
const call=id=>{let last;return async(db,value,extra={})=>{const p={PBXcallId:id,...extra};if(last&&value!==undefined)p[last.name]=value;last=await handleTechnolineCall(db,p);return last}};

test('phone self-registration, menu, and voice message',async()=>{
 const {db:d,sql}=db(),c=call('call-1');
 let r=await c(d);assert.equal(r.type,'getDTMF');assert.equal(r.min,1);
 r=await c(d,'0');assert.match(r.files[0].text,/הרשמה/);
 r=await c(d,'123456782');assert.match(r.files[0].text,/בחרו סיסמה/);
 r=await c(d,'654321');assert.match(r.files[0].text,/שוב/);
 r=await c(d,'111111');assert.match(r.files[0].text,/אינן תואמות/);
 r=await c(d,'654321');r=await c(d,'654321');assert.match(r.files[0].text,/נרשמתם/);
 r=await c(d,'0521234567');assert.match(r.files[0].text,/טלפון השחזור נשמר/);
 assert.equal(sql.prepare('SELECT recoveryPhone FROM participants WHERE nationalId=?').get('123456782').recoveryPhone,'0521234567');
 r=await c(d,'6');assert.equal(r.type,'record');
 r=await c(d,'msg.wav',{['FILEID_'+r.name]:'F77'});assert.match(r.files[0].text,/ההודעה נשמרה/);
 assert.equal(sql.prepare('SELECT audioKey FROM messages').get().audioKey,'technoline:F77');
});

test('short legacy password accepted at login prompt',async()=>{
 const {db:d}=db(),c=call('call-2');await c(d);
 const r=await c(d,'123456782');assert.equal(r.min,1);
});
