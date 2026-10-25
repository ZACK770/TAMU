import {uploadAudioQueue,audioExtension,audioQuestion,resizeOptions,moveQuestion,questionErrors,MAX_QUESTIONS} from './exam-questions.mjs';
export function mountExamBuilder(e,ctx){
 const {openPanel,esc,local,key,stRow,parseQs,api,toast,go}=ctx;
 const view=openPanel(e.id?'עריכת מבחן · '+e.title:'בונים מבחן חדש',true),panel=view.closest('#panel');
 const qs=(e.questions||[]).map(q=>({...q,options:[...(q.options||[])]}));
 const pending=new Map();let busy=false,dirty=false,recording=null,recordingStream=null,disposed=false;
 const $=s=>view.querySelector(s),input=n=>view.querySelector('[name="'+n+'"]');
 const initialSettings=e.settings||JSON.parse(e.examOptions||'{}');
 const fullAudio=qs.some(q=>q.audioIncludesOptions)||e.entryMode==='audio';
 view.classList.add('exam-workspace');
 view.innerHTML=`<form id="exam-builder">
 <section class="builder-hero"><span class="eyebrow">סביבת בניית מבחנים</span><h2>מההקלטה למבחן, שאלה אחר שאלה</h2><p>שם, מועדים ושאלות — זה כל מה שצריך כדי להתחיל. ההגדרות הנוספות מחכות למי שצריך אותן.</p><ol class="builder-steps"><li>1 <span>פרטי המבחן</span></li><li>2 <span>שאלות ותשובות</span></li><li>3 <span>בדיקה ושמירה</span></li></ol></section>
 <section class="card builder-section"><h3><span class="step-number">1</span> פרטי המבחן</h3><div class="row">
 <label>שם המבחן<input name="title" value="${esc(e.title)}" placeholder="למשל: פרשת נח · שיחה שבועית" required></label>
 <label>היכן נבחנים?<select name="program" ${e.id?'disabled':''}><option value="phone">בקו הטלפוני</option><option value="bifnim" ${e.program==='bifnim'?'selected':''}>באתר בפנים</option></select></label>
 <label>מסלול<select name="track"><option value="easy">קל</option><option value="challenging" ${e.track==='challenging'?'selected':''}>מאתגר</option></select></label>
 <label>סוג הלימוד<select name="kind"><option value="sicha">שיחה</option><option value="maamar" ${e.kind==='maamar'?'selected':''}>מאמר</option></select></label></div>
 <div class="row"><label>נפתח בתאריך ובשעה<input type="datetime-local" name="opensAt" value="${local(e.opensAt)}" required></label><label>נסגר בתאריך ובשעה<input type="datetime-local" name="closesAt" value="${local(e.closesAt)}" required></label></div>
 <details id="material-options"><summary>שיוך למסלול ולחומר הלימוד · אפשרויות נוספות</summary><p class="muted">אותו מזהה חומר ואותו שבוע בשני מסלולים מונעים היבחנות כפולה על אותו חומר.</p><div class="row"><label>מזהה חומר<input name="materialKey" value="${esc(e.materialKey)}" required placeholder="למשל: noach-sicha"></label><label>שבוע<input name="week" value="${esc(e.week)}" required placeholder="למשל: נח תשפ״ז"></label><label>קטגוריה<input name="category" value="${esc(e.category)}"></label><label>פרשה / פירוט<input name="parsha" value="${esc(e.parsha)}"></label></div></details></section>
 <section class="card builder-section"><h3><span class="step-number">2</span> שאלות ותשובות <span id="question-summary" class="pill"></span></h3>
 <div class="source-choices" role="group" aria-label="דרך הוספת שאלות"><button type="button" data-source="audio" class="source-choice ${fullAudio?'selected':''}"><b>מבחן מהקלטות</b><span>השאלה והתשובות כבר מוקלטות? מעלים קבצים יחד ומסמנים את המקש הנכון.</span></button><button type="button" data-source="text" class="source-choice ${!fullAudio?'selected':''}"><b>מבחן מטקסט</b><span>כותבים שאלה ותשובות, מייבאים טקסט או מוסיפים הקלטה לשאלה.</span></button></div>
 <div id="audio-tools" ${fullAudio?'':'hidden'}><div class="audio-drop"><b>כל קובץ הוא שאלה אחת</b><p>ההקלטה כוללת את השאלה ואת התשובות, כולל המספר שיש להקיש לכל תשובה. המערכת משמיעה אותה בשלמותה.</p><label class="file-picker">בחירת הקלטות מהמחשב<input id="batch-audio" type="file" multiple accept="audio/*,.m4a,.opus"></label><small>עד 20MB לקובץ. הסדר הראשוני הוא הסדר שהדפדפן מסר; בדקו וסדרו לפני ההעלאה.</small></div><div id="upload-queue"></div><button type="button" id="upload-all" hidden>העלאת הקבצים לפי הסדר</button><p id="upload-status" role="status" aria-live="polite"></p></div>
 <div id="text-tools" ${fullAudio?'hidden':''} class="row"><button type="button" class="sec" id="add-question">הוספת שאלה מטקסט</button><button type="button" class="sec" id="text-import">ייבוא כמה שאלות מטקסט</button></div>
 <div id="import-box" hidden><p class="import-instructions">כל שאלה מתחילה בשורת השאלה ואחריה התשובות. בין שאלות משאירים <b>שורה ריקה ממש</b> — שתי לחיצות Enter. אפשר לסמן תשובה נכונה בכוכבית או לבחור אותה אחר כך בכרטיס השאלה.</p><label>הדבקת שאלות ותשובות<textarea id="import-text" placeholder="מהי התשובה?&#10;*תשובה נכונה&#10;תשובה נוספת"></textarea></label><div id="import-preview" role="status" aria-live="polite"></div><button type="button" id="import-apply" disabled>הדביקו שאלות כדי להמשיך</button></div>
 <p class="builder-hint">אפשר לשנות את הסדר עם החצים. במבחן מוקלט רציף מומלץ להפעיל ״סדר קבוע״ בהגדרות למטה.</p><div id="questions"></div></section>
 <section class="card builder-section"><h3><span class="step-number">3</span> שמירה ופרסום</h3><p id="exam-default-summary" class="muted"></p>
 <details id="exam-options"><summary>ניקוד, הגרלה ובונוסים · אפשרויות נוספות</summary><label class="inline-check"><input type="checkbox" id="use-all" ${!e.id&&!qs.length?'checked':''}> לכלול את כל השאלות שהוספתי במבחן של כל נבחן</label>
 <div class="row"><label>שאלות רגילות לכל נבחן<input type="number" name="questionCount" value="${e.questionCount||Math.max(1,qs.filter(q=>!q.bonus).length)}" min="1" max="200" required></label><label>שאלות בונוס לכל נבחן<input type="number" name="bonusCount" value="${e.bonusCount||0}" min="0" max="200" required></label><label>נקודות לשאלה רגילה<input type="number" id="default-points" value="${e.defaultPoints||qs.find(q=>!q.bonus&&!q.customPoints)?.points||1}" min="1" required></label><label>נקודות לשאלת בונוס<input type="number" id="bonus-points" value="${e.bonusPoints||qs.find(q=>q.bonus&&!q.customPoints)?.points||1}" min="1" required></label></div>
 ${stRow({...initialSettings,fixedOrder:initialSettings.fixedOrder??fullAudio},'s_')}
 </details><label>מצב המבחן<select name="published"><option value="0">טיוטה · לא מוצגת לנבחנים</option><option value="1" ${e.published?'selected':''}>מפורסם · זמין בשעות שהוגדרו</option></select></label><p class="muted">שמירה כטיוטה שומרת מבחן שלם בלי לפתוח אותו לנבחנים. שאלות והקלטות שטרם נשמרו במבחן לא ישוחזרו אחרי סגירת החלון.</p></section>
 <div id="builder-errors" class="builder-errors" role="alert" tabindex="-1" hidden></div>
 <footer class="builder-footer"><span id="readiness">מוכנים כשתסיימו לסמן תשובות</span><button type="submit" id="save-exam">שמירת המבחן</button><button type="button" class="sec" id="cancel-builder">סגירה</button></footer></form>`;

 // Keep existing values but move uncommon fields out of the main workflow.
 const materialOptions=$('#material-options');
 for(const name of ['track','kind'])materialOptions.append(input(name).closest('label'));
 for(const name of ['materialKey','week'])input(name).required=false;
 const materialNote=materialOptions.querySelector('p');materialNote.textContent='השבוע ומזהה החומר ייווצרו אוטומטית אם לא תמלאו אותם. כשאותו חומר נבחן בשני מסלולים, הגדירו בשניהם את אותו שבוע ואת אותו מזהה חומר.';
 const cleanup=()=>{disposed=true;window.removeEventListener('beforeunload',unload);if(recording?.state==='recording')recording.stop();recordingStream?.getTracks().forEach(t=>t.stop());view.classList.remove('exam-workspace');panel._beforeClose=null};
 const unload=ev=>{if(dirty||busy){ev.preventDefault();ev.returnValue=''}};
 window.addEventListener('beforeunload',unload);
 panel._beforeClose=()=>{if(busy){toast('ההעלאה עדיין מתבצעת. המתינו לסיום לפני הסגירה.');return false}if(dirty&&!confirm('השינויים במבחן עדיין לא נשמרו. לסגור בלי לשמור?'))return false;cleanup();return true};
 const errors=messages=>{const box=$('#builder-errors');box.hidden=!messages.length;box.innerHTML=messages.length?'<b>עוד רגע והמבחן מוכן</b><ul>'+messages.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'';if(messages.length)box.focus()};
 const pointDefault=q=>Number($(q.bonus?'#bonus-points':'#default-points').value)||1;
 const sync=()=>view.querySelectorAll('[data-question]').forEach(card=>{
  const q=qs.find(q=>q.id===card.dataset.question);if(!q)return;
  q.text=card.querySelector('.question-text').value.trim();q.bonus=card.querySelector('.question-bonus').checked;
  const points=card.querySelector('.question-points').value;q.customPoints=points!=='';q.points=points!==''?Number(points):pointDefault(q);
  const correct=card.querySelector('.correct-choice:checked');q.correct=correct?Number(correct.value):-1;
  if(!q.audioIncludesOptions)q.options=[...card.querySelectorAll('.option-text')].map(x=>x.value.trim());
 });
 const updateCounts=()=>{if($('#use-all').checked){input('questionCount').value=qs.filter(q=>!q.bonus).length;input('bonusCount').value=qs.filter(q=>q.bonus).length}input('questionCount').readOnly=input('bonusCount').readOnly=$('#use-all').checked};
 const updateSummary=()=>{const ready=qs.filter(q=>q.audioKey||q.text).length,chosen=qs.filter(q=>q.correct>=0).length;$('#question-summary').textContent=qs.length+' שאלות במאגר';$('#readiness').textContent=chosen+' מתוך '+qs.length+' שאלות עם תשובה נכונה';$('#exam-default-summary').textContent='ברירת המחדל: '+$('#default-points').value+' נקודות לשאלה רגילה. אפשר לשנות ניקוד, מספר שאלות ובונוסים באפשרויות הנוספות.';$('#save-exam').disabled=busy;updateCounts()};
 const queueDraw=()=>{const list=qs.filter(q=>pending.has(q.id));$('#upload-queue').innerHTML=list.length?'<ol class="upload-queue">'+list.map(q=>{const task=pending.get(q.id),i=qs.indexOf(q);return '<li><span class="queue-index">'+(i+1)+'</span><span><b>'+esc(task.file.name)+'</b><small>'+esc(task.error||({waiting:'ממתין להעלאה',uploading:'מעלה את ההקלטה…',failed:'ההעלאה נכשלה'}[task.state]))+'</small></span><button type="button" class="sec" data-move="'+esc(q.id)+'" data-dir="-1" aria-label="הקדמת '+esc(task.file.name)+'" '+(busy?'disabled':'')+'>↑</button><button type="button" class="sec" data-move="'+esc(q.id)+'" data-dir="1" aria-label="דחיית '+esc(task.file.name)+'" '+(busy?'disabled':'')+'>↓</button><button type="button" class="sec" data-remove="'+esc(q.id)+'" '+(busy?'disabled':'')+'>הסרה</button></li>'}).join('')+'</ol>':'';$('#upload-all').hidden=!list.length;$('#upload-all').disabled=busy;$('#upload-all').textContent=list.some(q=>pending.get(q.id).state==='failed')?'ניסיון נוסף לקבצים שלא הועלו':'העלאת הקבצים לפי הסדר';$('#batch-audio').disabled=busy};
 const draw=()=>{$('#questions').innerHTML=qs.map((q,i)=>`<article class="question-card" data-question="${esc(q.id)}"><div class="question-head"><span class="question-number">${i+1}</span><div><h4>${q.audioIncludesOptions?'שאלה מוקלטת':'שאלה מטקסט'}</h4><small>${esc(q.sourceName||'השאלה תושמע לפי ההגדרות שבחרתם')}</small></div><div class="question-actions"><button type="button" class="sec" data-move="${esc(q.id)}" data-dir="-1" aria-label="הקדמת שאלה ${i+1}" ${i===0||busy?'disabled':''}>↑</button><button type="button" class="sec" data-move="${esc(q.id)}" data-dir="1" aria-label="דחיית שאלה ${i+1}" ${i===qs.length-1||busy?'disabled':''}>↓</button><button type="button" class="sec" data-remove="${esc(q.id)}" ${busy?'disabled':''}>הסרה</button></div></div>
 ${q.audioKey?`<audio controls preload="none" aria-label="האזנה לשאלה ${i+1}" src="/api/admin/audio?key=${encodeURIComponent(q.audioKey)}"></audio>`:q.audioIncludesOptions?'<p class="upload-note">הקובץ ממתין להעלאה. לחצו על כפתור ההעלאה מעל רשימת השאלות.</p>':''}
 <label>${q.audioIncludesOptions?'שם השאלה לצוות בלבד · לא יוקרא':'טקסט השאלה להקראה'}<input class="question-text" value="${esc(q.text)}"></label>
 <div class="row"><label>כמה תשובות יש בשאלה?<select class="option-count">${Array.from({length:8},(_,j)=>'<option value="'+(j+2)+'" '+(q.options.length===j+2?'selected':'')+'>'+(j+2)+' תשובות</option>').join('')}</select></label><label class="inline-check"><input type="checkbox" class="question-bonus" ${q.bonus?'checked':''}> שאלת בונוס</label><label>ניקוד מיוחד לשאלה<input type="number" class="question-points" min="1" placeholder="לפי ברירת המחדל" value="${q.customPoints?q.points:''}"></label></div>
 <fieldset class="answer-choices"><legend>מהי התשובה הנכונה?</legend>${q.options.map((o,j)=>`<label class="answer-choice ${q.correct===j?'is-correct':''}"><input type="radio" class="correct-choice" name="correct_${esc(q.id)}" value="${j}" ${q.correct===j?'checked':''}><b>מקש ${j+1}</b>${q.audioIncludesOptions?'':`<input class="option-text" value="${esc(o)}" aria-label="תוכן תשובה ${j+1}" placeholder="תוכן התשובה">`}<span class="correct-label">${q.correct===j?'התשובה הנכונה':'סימון כנכונה'}</span></label>`).join('')}</fieldset>
 <details><summary>קובץ השמע ואופן ההקראה</summary><label class="inline-check"><input type="checkbox" class="audio-includes-options" ${q.audioIncludesOptions?'checked':''}> ההקלטה כוללת גם את התשובות והמקשים · ללא הקראה נוספת של התשובות</label><p class="muted">כשהאפשרות כבויה, ההקלטה מחליפה רק את טקסט השאלה והתשובות מוקראות מהטקסט.</p><label>החלפת הקלטה / הוספת שמע לשאלה<input type="file" class="single-audio" accept="audio/*,.m4a,.opus" ${busy?'disabled':''}></label><button type="button" class="sec" data-record="${esc(q.id)}" ${busy?'disabled':''}>הקלטה מהמיקרופון</button> ${q.audioKey?`<button type="button" class="sec" data-clear-audio="${esc(q.id)}" ${busy?'disabled':''}>הסרת ההקלטה וחזרה לטקסט</button>`:''}</details></article>`).join('')||'<div class="builder-empty"><b>כאן יופיעו השאלות שלכם</b><p>בחרו קובצי שמע או הוסיפו שאלה מטקסט כדי להתחיל.</p></div>';view.querySelectorAll('[data-question]').forEach(card=>{
 const q=qs.find(q=>q.id===card.dataset.question),details=card.querySelector('details');
 details.querySelector('summary').textContent='ניקוד, בונוס ואפשרויות הקלטה';
 details.append(card.querySelector('.question-bonus').closest('label'),card.querySelector('.question-points').closest('label'));
 if(q.audioIncludesOptions)details.append(card.querySelector('.question-text').closest('label'));
 });queueDraw();updateSummary()};

 const uploadFile=async file=>{
  const type=audioExtension(file),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
  try{const r=await fetch('/api/admin/audio?type='+encodeURIComponent(type),{method:'POST',body:file,signal:controller.signal});const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.audioKey)throw new Error(j.error||'הקובץ לא הועלה. נסו שוב');return j.audioKey;
  }finally{clearTimeout(timer)}
 };
 const uploadAll=async()=>{
  if(busy)return;sync();busy=true;errors([]);draw();
  await uploadAudioQueue(qs,pending,uploadFile,({question,index,total,phase})=>{
   if(phase==='uploading'){$('#upload-status').textContent='מעלה קובץ '+(index+1)+' מתוך '+total+': '+pending.get(question.id).file.name;queueDraw()}
   else{sync();draw()}
  });
  busy=false;dirty=true;draw();$('#upload-status').textContent=pending.size?'חלק מהקבצים לא הועלו. נסו שוב או הסירו אותם. שאר הקבצים נשמרו ברשימה.':'כל ההקלטות הועלו. עכשיו סמנו תשובה נכונה בכל שאלה ושמרו את המבחן.';
 };
 const addFiles=files=>{
  sync();const messages=[];for(const file of files){
   if(qs.length>=MAX_QUESTIONS){messages.push('אפשר לכלול עד 200 שאלות במאגר');break}
   try{audioExtension(file);const q=audioQuestion(file,'q-'+key(),Number($('#default-points').value)||1);qs.push(q);pending.set(q.id,{file,state:'waiting',error:''});dirty=true}
   catch(err){messages.push(file.name+': '+err.message)}
  }errors(messages);draw();
 };
 $('#batch-audio').onchange=ev=>{addFiles([...ev.target.files]);ev.target.value=''};
 $('#upload-all').onclick=uploadAll;
 view.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>{
  const audio=button.dataset.source==='audio';$('#audio-tools').hidden=!audio;$('#text-tools').hidden=audio;
  view.querySelectorAll('[data-source]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button))});
  if(audio&&!qs.length&&!e.id){input('s_fixedOrder').checked=true;dirty=true}
 });
 $('#add-question').onclick=()=>{if(busy)return;sync();if(qs.length>=MAX_QUESTIONS){errors(['אפשר לכלול עד 200 שאלות']);return}qs.push({id:'q-'+key(),text:'',options:['','','',''],correct:-1,bonus:false,points:Number($('#default-points').value)||1});dirty=true;draw()};
 const importPreview=()=>{
 const incoming=parseQs($('#import-text').value,'q'),valid=incoming.length&&incoming.every(q=>q.options.length>=2&&q.options.length<=9);
 $('#import-preview').innerHTML=incoming.length?'<b>זוהו '+incoming.length+' שאלות</b><ol>'+incoming.map(q=>'<li>'+esc(q.text)+' <small>· '+q.options.length+' תשובות'+(q.correct>=0?' · סומנה תשובה נכונה':' · יש לבחור תשובה נכונה בהמשך')+'</small></li>').join('')+'</ol>'+(!valid?'<p class="err">לכל שאלה דרושות 2–9 תשובות. אם זוהתה שאלה אחת במקום כמה, הוסיפו שורה ריקה בין השאלות.</p>':''):'';
 $('#import-apply').disabled=!valid;$('#import-apply').textContent=valid?'הוספת '+incoming.length+' שאלות למבחן':'הדביקו שאלות בפורמט המוצג';
 };
 $('#import-text').oninput=importPreview;
 $('#text-import').onclick=()=>{$('#import-box').hidden=!$('#import-box').hidden;if(!$('#import-box').hidden){$('#import-text').focus();importPreview()}};

 $('#import-apply').onclick=()=>{if(busy)return;sync();const incoming=parseQs($('#import-text').value,'q');if(!incoming.length){errors(['לא זוהו שאלות. הפרידו בין שאלות בשורה ריקה.']);return}if(qs.length+incoming.length>MAX_QUESTIONS){errors(['אפשר לכלול עד 200 שאלות במאגר']);return}qs.push(...incoming.map(q=>({...q,id:'q-'+key(),points:Number($('#default-points').value)||1})));dirty=true;$('#import-text').value='';importPreview();$('#import-box').hidden=true;errors([]);draw()};
 const queueReplacement=async(q,file)=>{
  try{audioExtension(file);sync();pending.set(q.id,{file,state:'waiting',error:''});dirty=true;$('#audio-tools').hidden=false;draw();await uploadAll()}catch(err){errors([err.message])}
 };
 view.addEventListener('click',async ev=>{
  const button=ev.target.closest('button');if(!button)return;const id=button.dataset.move||button.dataset.remove||button.dataset.clearAudio||button.dataset.record;const q=qs.find(q=>q.id===id);
  if(!q)return;
  if(button.dataset.record&&recording?.state==='recording'){recording.stop();return}
  if(busy)return;
  if(button.dataset.move){sync();moveQuestion(qs,qs.indexOf(q),Number(button.dataset.dir));dirty=true;draw()}
  if(button.dataset.remove){if(!confirm('להסיר את השאלה מהמבחן?'))return;sync();qs.splice(qs.indexOf(q),1);pending.delete(q.id);dirty=true;draw()}
  if(button.dataset.clearAudio){sync();delete q.audioKey;pending.delete(q.id);if(q.audioIncludesOptions){q.options=q.textOptions||q.options.map(()=> '');q.correct=-1;q.text=''}delete q.textOptions;q.audioIncludesOptions=false;dirty=true;draw()}
  if(button.dataset.record){
   try{
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('הקלטה מהמיקרופון אינה זמינה בדפדפן הזה. אפשר להעלות קובץ מהמחשב.');
    recordingStream=await navigator.mediaDevices.getUserMedia({audio:true});recording=new MediaRecorder(recordingStream);const chunks=[];
    recording.ondataavailable=ev=>chunks.push(ev.data);
    recording.onstop=()=>{recordingStream.getTracks().forEach(t=>t.stop());busy=false;if(disposed)return;const type=recording.mimeType||'audio/webm',ext=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';queueReplacement(q,new File(chunks,'recording.'+ext,{type})).catch(err=>errors([err.message]))};
    recording.start();busy=true;dirty=true;$('#save-exam').disabled=true;button.textContent='עצירה והעלאת ההקלטה';$('#upload-status').textContent='המיקרופון מקליט. לסיום לחצו על עצירה.';
   }catch(err){busy=false;recordingStream?.getTracks().forEach(t=>t.stop());errors(['לא הצלחנו להפעיל את המיקרופון. '+err.message]);updateSummary()}
  }
 });
 view.addEventListener('change',ev=>{
  const card=ev.target.closest('[data-question]'),q=card&&qs.find(q=>q.id===card.dataset.question);
  dirty=true;
  if(q&&ev.target.matches('.single-audio')){const file=ev.target.files[0];if(file)queueReplacement(q,file);return}
  sync();
  if(q&&ev.target.matches('.option-count')){resizeOptions(q,Number(ev.target.value));draw()}
  else if(q&&ev.target.matches('.audio-includes-options')){q.audioIncludesOptions=ev.target.checked;if(q.audioIncludesOptions){q.textOptions=[...q.options];q.options=q.options.map((_,i)=>String(i+1));$('#audio-tools').hidden=false}else{q.options=q.textOptions||q.options.map(()=> '');delete q.textOptions}draw()}
  else if(ev.target.matches('.correct-choice')){
   card.querySelectorAll('.answer-choice').forEach(label=>{const correct=label.querySelector('.correct-choice').checked;label.classList.toggle('is-correct',correct);label.querySelector('.correct-label').textContent=correct?'התשובה הנכונה':'סימון כנכונה'});updateSummary();
  }else updateSummary();
 });
 view.addEventListener('input',()=>{dirty=true});
 $('#cancel-builder').onclick=()=>go('מבחנים');
 $('#exam-builder').onsubmit=async ev=>{
  ev.preventDefault();if(busy)return;sync();updateCounts();
  const messages=questionErrors(qs);
  if(pending.size)messages.unshift('יש קבצים שעדיין לא הועלו. סיימו את ההעלאה או הסירו אותם.');
  if(!qs.length)messages.unshift('הוסיפו לפחות שאלה אחת');
  if(input('program').value==='bifnim'&&qs.some(q=>q.audioIncludesOptions))messages.unshift('שאלות שבהן התשובות מוקלטות מיועדות לקו הטלפוני. לאתר בפנים השתמשו בתשובות כתובות.');
  const regular=qs.filter(q=>!q.bonus).length,bonus=qs.length-regular;
  if(Number(input('questionCount').value)>regular)messages.push('נבחרו יותר שאלות רגילות מהכמות הקיימת במאגר');
  if(Number(input('bonusCount').value)>bonus)messages.push('נבחרו יותר שאלות בונוס מהכמות הקיימת במאגר');
  if(new Date(input('opensAt').value)>=new Date(input('closesAt').value))messages.push('מועד הסגירה צריך להיות מאוחר ממועד הפתיחה');
  errors(messages);if(messages.length)return;
  const form=Object.fromEntries(new FormData(ev.target));
  if(!form.week.trim())form.week=form.opensAt.slice(0,10);
  if(!form.materialKey.trim()){const normalized=form.title.normalize('NFKC').trim().replace(/\s+/g,' ')+':'+form.kind;const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));form.materialKey='material-'+[...new Uint8Array(hash)].slice(0,8).map(n=>n.toString(16).padStart(2,'0')).join('')}
  const settings={feedback:!!form.s_feedback,sayPoints:!!form.s_sayPoints,fixedOrder:!!form.s_fixedOrder,minScore:Number(form.s_minScore)||0,fixedPoints:Number(form.s_fixedPoints)||0};
  Object.keys(form).filter(k=>k.startsWith('s_')||k.startsWith('correct_')).forEach(k=>delete form[k]);
  const questions=qs.map(({textOptions,...q})=>({...q,points:q.customPoints?q.points:pointDefault(q)}));
  busy=true;updateSummary();$('#save-exam').textContent='שומר את המבחן…';
  try{await api('saveExam',{data:{...e,...form,program:form.program||e.program||'phone',opensAt:new Date(form.opensAt).toISOString(),closesAt:new Date(form.closesAt).toISOString(),questionCount:Number(form.questionCount),bonusCount:Number(form.bonusCount),published:form.published==='1',settings,questions}});busy=false;dirty=false;toast(form.published==='1'?'המבחן נשמר. הוא יהיה זמין במועדים שהוגדרו.':'המבחן נשמר כטיוטה. הוא עדיין לא מוצג לנבחנים.');go('מבחנים')}
  catch(err){busy=false;errors([err.message||'המבחן לא נשמר. השאלות נשארו כאן לניסיון נוסף.']);updateSummary();$('#save-exam').textContent='ניסיון נוסף לשמירה'}
 };
 draw();
}
