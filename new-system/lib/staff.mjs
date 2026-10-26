import * as D from './domain.mjs';
export const ROLES=Object.freeze(['admin','editor','support','merchant','operator']);
const q=(db,s,...a)=>db.prepare(s).bind(...a);
const fail=(m,s=400)=>{throw new D.DomainError(m,s)};
const cookieName='tv_staff';
function username(v){const s=String(v||'').trim().toLowerCase();if(!/^[a-z0-9_.-]{3,32}$/.test(s))fail('שם משתמש לא תקין');return s}
export async function createStaff(db,{username:u,name,password,role,scope=null},actor){
 u=username(u);if(!ROLES.includes(role))fail('תפקיד לא תקין');if(String(password||'').length<10)fail('סיסמת צוות חייבת לפחות 10 תווים');
 if(role==='merchant'&&!scope?.merchant)fail('למוכר חובה להגדיר חנות');
 if(role==='operator'&&!scope?.stand)fail('למפעיל דוכן חובה לבחור דוכן');
 const id=crypto.randomUUID();
 await db.batch([q(db,'INSERT INTO staff_accounts(id,username,name,passwordHash,role,scope,active,createdAt) VALUES(?,?,?,?,?,?,1,?)',id,u,String(name||u).slice(0,80),await D.hashPassword(password),role,scope?JSON.stringify(scope):null,D.now()),D.auditStatement(db,actor,'staff.create',id,{username:u,role})]);
 return {id,username:u,role};
}
export async function setStaffActive(db,id,active,actor){await db.batch([q(db,'UPDATE staff_accounts SET active=? WHERE id=?',active?1:0,id),q(db,'DELETE FROM staff_sessions WHERE staffId=?',id),D.auditStatement(db,actor,'staff.active',id,{active})])}
export async function staffLogin(db,u,password){
 u=username(u);const key='staff:'+u,t=D.now();
 const limit=await q(db,'SELECT * FROM auth_limits WHERE key=?',key).first();
 if(limit&&limit.failures>=5&&limit.until>t)fail('יותר מדי ניסיונות. נסו שוב בעוד רבע שעה',429);
 const s=await q(db,'SELECT * FROM staff_accounts WHERE username=?',u).first();
 const [salt]=(s?.passwordHash||'x:').split(':');
 const ok=s&&s.active&&s.passwordHash===salt+':'+await D.derive(password,salt);
 if(!ok){await q(db,'INSERT INTO auth_limits(key,failures,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN auth_limits.until<? THEN 1 ELSE auth_limits.failures+1 END,until=excluded.until',key,new Date(Date.now()+900000).toISOString(),t).run();fail('פרטי הכניסה שגויים',401)}
 const token=crypto.randomUUID()+crypto.randomUUID();
 await db.batch([q(db,'DELETE FROM auth_limits WHERE key=?',key),q(db,'INSERT INTO staff_sessions(tokenHash,staffId,expiresAt) VALUES(?,?,?)',await D.digest(token),s.id,new Date(Date.now()+12*3600000).toISOString()),D.auditStatement(db,s.id,'staff.login',s.id)]);
 return {token,staff:publicStaff(s)};
}
const publicStaff=s=>({id:s.id,userId:s.id,username:s.username,name:s.name,role:s.role,scope:s.scope?JSON.parse(s.scope):null});
export function staffCookie(token,secure,clear=false){return cookieName+'='+(clear?'':token)+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+(clear?0:43200)+(secure?'; Secure':'')}
export async function authorizeStaff(db,req){
 const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)tv_staff=([a-f0-9-]{72})/);if(!m)fail('נדרשת כניסת צוות',401);
 const row=await q(db,'SELECT a.* FROM staff_sessions s JOIN staff_accounts a ON a.id=s.staffId WHERE s.tokenHash=? AND s.expiresAt>? AND a.active=1',await D.digest(m[1]),D.now()).first();
 if(!row)fail('נדרשת כניסת צוות',401);return publicStaff(row);
}
export async function staffLogout(db,req){const m=(req.headers.get('cookie')||'').match(/tv_staff=([a-f0-9-]{72})/);if(m)await q(db,'DELETE FROM staff_sessions WHERE tokenHash=?',await D.digest(m[1])).run()}
