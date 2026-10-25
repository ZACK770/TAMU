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
 r=await c(d,'0521234567');assert.equal(r.type,'record');assert.match(r.files[0].text,/טלפון השחזור נשמר/);
 r=await c(d,'v.wav',{['FILEID_'+r.name]:'F10'});assert.match(r.files[0].text,/ההרשמה הושלמה/);
 assert.equal(sql.prepare('SELECT regAudioKey FROM participants WHERE nationalId=?').get('123456782').regAudioKey,'technoline:F10');
 assert.equal(sql.prepare('SELECT recoveryPhone FROM participants WHERE nationalId=?').get('123456782').recoveryPhone,'0521234567');
 r=await c(d,'6');assert.equal(r.type,'record');
 r=await c(d,'msg.wav',{['FILEID_'+r.name]:'F77'});assert.match(r.files[0].text,/ההודעה נשמרה/);
 assert.equal(sql.prepare('SELECT audioKey FROM messages').get().audioKey,'technoline:F77');
});

test('short legacy password accepted at login prompt',async()=>{
 const {db:d}=db(),c=call('call-2');await c(d);
 const r=await c(d,'123456782');assert.equal(r.min,1);
});

test('staff messages play in sequence, newest first, marked heard',async()=>{
 const {db:d,sql}=db(),c=call('call-msg');
 let r=await c(d);r=await c(d,'0');r=await c(d,'123456782');r=await c(d,'654321');r=await c(d,'654321');r=await c(d,'');
 const pid=sql.prepare('SELECT id FROM participants WHERE nationalId=?').get('123456782').id;
 const ins=sql.prepare("INSERT INTO messages(id,participantId,subject,body,reply,status,createdAt,broadcastId) VALUES(?,?,?,?,?,'answered',?,?)");
 ins.run('m1',pid,'ישנה','','הודעה ראשונה','2026-01-01T10:00:00Z','b1');ins.run('m2',pid,'חדשה','','הודעה שנייה','2026-01-02T10:00:00Z','b2');
 sql.prepare("INSERT INTO messages(id,participantId,subject,body,audioKey,createdAt) VALUES('own',?,'הודעה','שלי','technoline:F1','2026-01-03T10:00:00Z')").run(pid);
 for(let i=0;i<4&&!/למבחנים/.test(JSON.stringify(r));i++)r=await c(d,'');
 r=await c(d,'5');assert.match(r.files[0].text,/2 הודעות חדשות.*הודעה 1 מתוך 2. חדשה/);assert.equal(r.files[1].text,'הודעה שנייה');
 r=await c(d,'1');assert.equal(r.files[1].text,'הודעה שנייה');
 r=await c(d,'2');assert.equal(r.files[1].text,'הודעה ראשונה');
 r=await c(d,'3');assert.equal(r.files[1].text,'הודעה שנייה');
 r=await c(d,'2');r=await c(d,'2');assert.match(r.files[0].text,/אלו כל ההודעות/);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM messages WHERE heardAt IS NOT NULL').get().n,2);
 r=await c(d,'5');assert.match(r.files[0].text,/אין הודעות חדשות/);
});

test('error handling: unknown id offers registration, wrong password retries, silence hangs up',async()=>{
 const {db:d}=db();let c=call('call-err');
 let r=await c(d);r=await c(d,'000000026');assert.match(r.files[0].text,/עוד לא רשומה.*להרשמה הקישו 1/);
 r=await c(d,'1');assert.match(r.files[0].text,/בחרו סיסמה של 4 עד 12/);
 r=await c(d,'1234');r=await c(d,'1234');assert.match(r.files[0].text,/נרשמתם/);
 c=call('call-err2');r=await c(d);r=await c(d,'000000026');assert.match(r.files[0].text,/הקישו את הסיסמה/);
 r=await c(d,'9999');assert.match(r.files[0].text,/הסיסמה שגויה. נסו שוב/);
 r=await c(d,'1234');assert.match(r.files[0].text,/שלום/);
 r=await c(d,'7');assert.match(r.files[0].text,/המקש הזה לא קיים כאן/);
 c=call('call-err3');r=await c(d);r=await c(d,'ERROR');assert.match(r.files[0].text,/לא נקלטה הקשה/);
 r=await c(d,'ERROR');r=await c(d,'ERROR');assert.match(r.files[0].text,/להתראות/);
});
