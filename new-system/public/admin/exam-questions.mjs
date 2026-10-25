export const MAX_AUDIO_BYTES=20*1024*1024;
export const MAX_QUESTIONS=200;
const AUDIO_TYPES=new Set(['mp3','wav','m4a','ogg','webm','aac','flac','opus']);
export function audioExtension(file){
 const ext=String(file.name||'').split('.').pop().toLowerCase();
 if(!AUDIO_TYPES.has(ext))throw new Error('בחרו קובץ שמע: MP3, WAV, M4A, OGG, WEBM, AAC, FLAC או OPUS');
 if(!file.size)throw new Error('הקובץ ריק. בחרו קובץ שמע אחר');
 if(file.size>MAX_AUDIO_BYTES)throw new Error('הקובץ גדול מ־20MB. פצלו או דחסו אותו לפני ההעלאה');
 return ext;
}
export function audioQuestion(file,id,points=1){
 return {id,text:file.name.replace(/\.[^.]+$/,''),sourceName:file.name,options:['1','2','3','4'],correct:-1,points,bonus:false,audioIncludesOptions:true};
}
export function resizeOptions(question,count){
 if(!Number.isInteger(count)||count<2||count>9)throw new Error('מספר התשובות צריך להיות בין 2 ל־9');
 question.options=Array.from({length:count},(_,i)=>question.audioIncludesOptions?String(i+1):question.options[i]||'');
 if(question.correct>=count)question.correct=-1;
 return question;
}
export function moveQuestion(questions,index,direction){
 const next=index+direction;
 if(index<0||index>=questions.length||next<0||next>=questions.length)return questions;
 [questions[index],questions[next]]=[questions[next],questions[index]];return questions;
}
export function questionErrors(questions){
 return questions.flatMap((q,i)=>{
  const errors=[],n='שאלה '+(i+1)+': ';
  if(!q.text?.trim()&&!q.audioKey)errors.push(n+'הוסיפו טקסט או הקלטה');
  if(q.audioIncludesOptions&&!q.audioKey)errors.push(n+'ההקלטה טרם הועלתה');
  if(q.options.length<2||q.options.length>9||q.options.some(x=>!String(x).trim()))errors.push(n+'מלאו בין 2 ל־9 תשובות');
  if(!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.options.length)errors.push(n+'בחרו תשובה נכונה');
  return errors;
 });
}

export function parseTextQuestions(text,prefix='q',points=1){
 const normalized=String(text).replace(/\r\n?/g,'\n').replace(/[\u2028\u2029]/g,'\n').replace(/[\u200B-\u200F\uFEFF]/g,'');
 return normalized.trim().split(/\n[ \t\u00A0]*\n+/).filter(block=>block.trim()).map((block,i)=>{
  const [text,...options]=block.split('\n').map(s=>s.trim()).filter(Boolean);
  return {id:prefix+'-'+(i+1),text,options:options.map(o=>o.replace(/^\*/,'')),correct:options.findIndex(o=>o.startsWith('*')),points};
 });
}

export async function uploadAudioQueue(questions,pending,upload,onProgress=()=>{}){
 const tasks=questions.filter(q=>pending.has(q.id));let uploaded=0;
 for(let i=0;i<tasks.length;i++){
  const question=tasks[i],task=pending.get(question.id);task.state='uploading';task.error='';
  await onProgress({question,index:i,total:tasks.length,phase:'uploading'});
  try{question.audioKey=await upload(task.file);question.sourceName=task.file.name;pending.delete(question.id);uploaded++}
  catch(error){task.state='failed';task.error=error.name==='AbortError'?'ההעלאה ארכה יותר מדי. אפשר לנסות שוב בלי להעלות מחדש את שאר הקבצים.':error.message}
  await onProgress({question,index:i,total:tasks.length,phase:'finished'});
 }
 return {uploaded,failed:tasks.length-uploaded};
}
