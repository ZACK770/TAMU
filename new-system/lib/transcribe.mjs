const TL='https://api.tlivr.com/ivrFilesApi.php';
const all=async(db,s,...a)=>(await db.prepare(s).bind(...a).all()).results;
async function audio(fileId){
 const r=await fetch(TL+'?action=fileDownload&audio='+encodeURIComponent(fileId)+'&apiKey='+encodeURIComponent(process.env.TECHNOLINE_SYSTEM_KEY||''));
 if(!String(r.headers.get('content-type')).startsWith('audio'))throw new Error('recording not found');
 return Buffer.from(await r.arrayBuffer()).toString('base64');
}
export async function gemini(fileId,instruction,json=false){
 const key=process.env.GEMINI_API_KEY;if(!key)return null;
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+(process.env.GEMINI_MODEL||'gemini-flash-latest')+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','X-goog-api-key':key},
  body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:'audio/mp3',data:await audio(fileId)}},{text:instruction}]}],generationConfig:{temperature:0,...(json?{responseMimeType:'application/json'}:{})}})});
 const j=await r.json(),t=j.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
 if(!t)throw new Error(j.error?.message||'empty transcription');
 return json?JSON.parse(t):t;
}
export const norm=s=>String(s||'').replace(/["'״׳]/g,'').replace(/[.,\-]/g,' ').replace(/\s+/g,' ').trim();
export function matchInstitution(spoken,list){
 const n=norm(spoken);if(!n)return null;
 return list.find(i=>[i.name,...JSON.parse(i.aliases||'[]')].some(a=>norm(a)===n))||null;
}
export async function transcribeMessage(db,messageId,fileId){
 if(!process.env.GEMINI_API_KEY)return;
 try{
  const t=await gemini(fileId,'תמלל במדויק את ההודעה הקולית בעברית. החזר רק את התמליל, בלי הקדמות. אם אין דיבור ברור החזר: [לא נשמע דיבור]');
  if(t)await db.prepare('UPDATE messages SET body=? WHERE id=?').bind(t.slice(0,2000),messageId).run();
 }catch(e){console.error('transcribe message:',e.message)}
}
export async function transcribeRegistration(db,pid,fileId){
 if(!process.env.GEMINI_API_KEY)return;
 try{
  const list=await all(db,'SELECT * FROM institutions');
  const r=await gemini(fileId,'בהקלטה בחור אומר את שמו המלא ואת שם המוסד (ישיבה) שבו הוא לומד. החזר JSON בלבד: {"name":"השם המלא","institution":"שם המוסד כפי שנאמר","institutionId":"המזהה מהרשימה רק אם ברור שזה אותו מוסד (גם אם נאמר בקיצור או בשיבוש), אחרת null"}. רשימת המוסדות: '+JSON.stringify(list.map(i=>({id:i.id,name:i.name,aliases:JSON.parse(i.aliases||'[]')}))),true);
  const hit=list.find(i=>i.id===r.institutionId)||matchInstitution(r.institution,list);
  const p=await db.prepare('SELECT name,institution FROM participants WHERE id=?').bind(pid).first();
  const name=p.name==='נרשם בטלפון'&&String(r.name||'').trim()?String(r.name).trim().slice(0,80):p.name;
  await db.prepare('UPDATE participants SET name=?,spokenInstitution=?,institution=? WHERE id=?').bind(name,String(r.institution||'').trim().slice(0,120)||null,p.institution||hit?.name||null,pid).run();
 }catch(e){console.error('transcribe registration:',e.message)}
}
