import {randomInt} from 'node:crypto';
import * as D from './domain.mjs';
import {youthDb} from './youth.mjs';
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const fail=(message,status=400)=>{throw new D.DomainError(message,status)};
export function normalizePhone(value){
 const s=String(value||'').trim().replace(/[\s()-]/g,'');
 const normalized=/^05\d{8}$/.test(s)?'972'+s.slice(1):/^\+?9725\d{8}$/.test(s)?s.replace(/^\+/,''):null;
 if(!normalized)fail('הזינו מספר נייד מלא, למשל 0501234567');return normalized;
}
export function phoneAuthOptions(env=process.env){
 const enabled=!!(env.BIFNIM_OTP_WEBHOOK_URL?.startsWith('https://')&&env.BIFNIM_OTP_WEBHOOK_TOKEN&&env.BIFNIM_OTP_SECRET?.length>=32);
 const channels=String(env.BIFNIM_OTP_CHANNELS||'sms').split(',').map(s=>s.trim()).filter(s=>['sms','whatsapp'].includes(s));
 return {phone:enabled&&channels.length>0,channels};
}
export async function sendOtp(payload,env=process.env){
 const timer=AbortSignal.timeout(15000);
 const res=await fetch(env.BIFNIM_OTP_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.BIFNIM_OTP_WEBHOOK_TOKEN},body:JSON.stringify(payload),signal:timer});
 if(!res.ok)throw new Error('OTP provider rejected delivery');
}
async function limit(db,key,max){
 const now=D.now(),until=new Date(Date.now()+15*60000).toISOString();
 const r=await q(db,'INSERT INTO auth_limits(key,failures,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN auth_limits.until<? THEN 1 ELSE auth_limits.failures+1 END,until=CASE WHEN auth_limits.until<? THEN excluded.until ELSE auth_limits.until END RETURNING failures',key,until,now,now).first();
 if(Number(r.failures)>max)fail('נשלחו כמה בקשות ברצף. נסו שוב בעוד רבע שעה.',429);
}
export async function requestPhoneCode(raw,data,{env=process.env,sender=sendOtp}={}){
 const options=phoneAuthOptions(env);if(!options.phone)fail('כניסה עם קוד עדיין לא הופעלה. אפשר להיכנס עם חשבון קיים.',503);
 const phone=normalizePhone(data.phone),channel=data.channel||options.channels[0];
 if(!options.channels.includes(channel))fail('דרך המשלוח הזאת אינה זמינה');
 const db=youthDb(raw),key='phone-otp:'+await D.digest(phone),prior=await q(db,'SELECT value FROM settings WHERE key=?',key).first();
 if(prior&&JSON.parse(prior.value).sentAt>Date.now()-60000)fail('אפשר לבקש קוד נוסף בעוד דקה.',429);
 await limit(db,'phone-send:'+await D.digest(phone),5);
 const code=String(randomInt(0,1000000)).padStart(6,'0'),nonce=crypto.randomUUID();
 const challenge={nonce,hash:await D.digest(env.BIFNIM_OTP_SECRET+':'+nonce+':'+code),sentAt:Date.now(),expires:Date.now()+5*60000,attempts:0,name:String(data.name||'').trim().slice(0,60),delivered:false};
 const value=JSON.stringify(challenge);
 // Reserve the phone atomically so parallel requests cannot send multiple codes.
 const reserved=prior?await q(db,'UPDATE settings SET value=? WHERE key=? AND value=? RETURNING key',value,key,prior.value).first():await q(db,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING RETURNING key',key,value).first();
 if(!reserved)fail('בקשת קוד כבר בטיפול. המתינו רגע.',429);
 try{await sender({phone,channel,code,expiresInSeconds:300,message:'קוד הכניסה שלך לבפנים: '+code+'. הקוד תקף ל־5 דקות. אין להעביר אותו לאחרים.'},env)}
 catch(error){await q(db,'DELETE FROM settings WHERE key=? AND value=?',key,value).run();fail('לא הצלחנו לשלוח את הקוד. בדקו את המספר ונסו שוב.',502)}
 challenge.delivered=true;
 await q(db,'UPDATE settings SET value=? WHERE key=? AND value=?',JSON.stringify(challenge),key,value).run();
 return {challengeId:nonce,phone:phone.replace(/^972/,'0'),channel,retryAfter:60,expiresIn:300};
}
export async function verifyPhoneCode(raw,data,{env=process.env}={}){
 if(!phoneAuthOptions(env).phone)fail('כניסה עם קוד עדיין לא הופעלה.',503);
 const phone=normalizePhone(data.phone),db=youthDb(raw),key='phone-otp:'+await D.digest(phone);
 const row=await q(db,'SELECT value FROM settings WHERE key=?',key).first();
 const c=row&&JSON.parse(row.value);
 if(!c||!c.delivered||c.nonce!==data.challengeId||c.expires<Date.now())fail('הקוד פג או הוחלף. בקשו קוד חדש.',401);
 await limit(db,'phone-verify:'+await D.digest(phone+':'+c.nonce),5);
 if(c.attempts>=5)fail('היו כמה ניסיונות שגויים. בקשו קוד חדש.',429);
 const hash=await D.digest(env.BIFNIM_OTP_SECRET+':'+c.nonce+':'+String(data.code||''));
 if(!/^\d{6}$/.test(String(data.code||''))||hash!==c.hash){
  c.attempts++;await q(db,'UPDATE settings SET value=? WHERE key=? AND value=?',JSON.stringify(c),key,row.value).run();
  fail('הקוד לא מתאים. בדקו את שש הספרות ונסו שוב.',401);
 }
 const consumed=await q(db,'DELETE FROM settings WHERE key=? AND value=? RETURNING key',key,row.value).first();
 if(!consumed)fail('הקוד כבר נוצל או הוחלף. בקשו קוד חדש.',401);
 // Prefix cannot be chosen through username registration, preventing account pre-claiming.
 const nationalId='@phone:'+phone;
 let participant=await q(db,'SELECT * FROM participants WHERE nationalId=?',nationalId).first();
 if(!participant){
  const id=crypto.randomUUID();await q(db,'INSERT INTO participants(id,nationalId,name,passwordHash,recoveryPhone,createdAt) VALUES(?,?,?,NULL,?,?) ON CONFLICT(nationalId) DO NOTHING',id,nationalId,c.name||'חבר בפנים','0'+phone.slice(3),D.now()).run();
  participant=await q(db,'SELECT * FROM participants WHERE nationalId=?',nationalId).first();
 }
 if(participant.blocked)fail('החשבון ממתין לבירור עם הצוות.',403);
 const token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
 await db.batch([q(db,'INSERT INTO sessions(tokenHash,participantId,expiresAt) VALUES(?,?,?)',await D.digest(token),participant.id,new Date(Date.now()+30*86400000).toISOString()),D.auditStatement(db,participant.id,'youth.phone.login',participant.id)]);
 return {token,participant:{id:participant.id,name:participant.name}};
}
