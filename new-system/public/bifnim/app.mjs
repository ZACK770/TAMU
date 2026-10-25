import {BRAND as copy} from './copy.mjs';
const $=s=>document.querySelector(s);
const main=$('#main'),modal=$('#modal');
const state={catalog:null,account:null,attempt:null,questionIndex:0,saving:false,admin:null,filter:'all'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='dark',extra='')=>'<button class="btn '+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const empty=(title,text)=>'<div class="empty"><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></div>';
const fmt=x=>new Intl.DateTimeFormat('he-IL',{timeZone:'Asia/Jerusalem',dateStyle:'short',timeStyle:'short'}).format(new Date(x));
const number=n=>Number(n||0).toLocaleString('he-IL');
const route=()=>decodeURIComponent(location.hash.slice(1)||'home');
const toast=message=>{const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4500)};
function notice(message){const el=$('#notice');el.textContent=message;el.hidden=!message;}
async function api(path,body){
 const res=await fetch('/api/youth/'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{credentials:'same-origin'});
 const j=await res.json().catch(()=>({error:'האתר לא הצליח להתחבר כרגע. אפשר לנסות שוב בעוד רגע.'}));
 if(!res.ok){const e=new Error(j.error||'הפעולה לא הושלמה');e.status=res.status;throw e}
 return j;
}
const pendingCode=new URLSearchParams(location.search).get('code');if(pendingCode){sessionStorage.setItem('bcode',pendingCode);history.replaceState(null,'',location.pathname+location.hash)}
async function redeemPending(){const c=sessionStorage.getItem('bcode');if(!c||!state.account)return;sessionStorage.removeItem('bcode');try{const r=await api('redeem',{code:c});state.account=await api('state');state.attempt=r.data.attempt;state.questionIndex=0;location.hash='quiz/'+r.data.examId;await render()}catch(e){notice(e.message)}}
async function refresh(){state.catalog=await api('catalog');try{state.account=await api('state')}catch(e){if(e.status===401)state.account=null;else throw e}renderNav();if(state.account&&sessionStorage.getItem('bcode'))setTimeout(redeemPending,0);}
function renderNav(){
 const nav=$('#account-nav');
 nav.innerHTML=state.account?'<a class="btn dark" href="#account">'+esc(state.account.participant.name)+' <span>↖</span></a>':button(copy.start,'login','dark');
 document.querySelectorAll('.header nav a').forEach(a=>a.classList.toggle('active',a.hash.slice(1)===route().split('/')[0]));
}
function courseCard(e,i=0){
 const a=state.account?.attempts?.find(a=>a.examId===e.id),status=a?.completed?'כבר פתחת את זה':a?'ממשיכים מכאן':(e.opensAt>new Date().toISOString()?'בקרוב':'פותחים עניין');
 const symbol=['↗','!','?'][i%3],accent=e.accent||['lime','violet','orange'][i%3];
 return '<article class="course-card"><a href="#lesson/'+esc(e.id)+'" class="course-art '+esc(accent)+'"><span class="art-number">0'+(i+1)+'</span><span class="symbol">'+symbol+'</span></a><div class="card-body"><div class="card-meta"><span>'+esc(e.durationMinutes||5)+' דקות של מחשבה</span><span>'+esc(e.week)+'</span></div><h3><a href="#lesson/'+esc(e.id)+'">'+esc(e.headline||e.title)+'</a></h3><p>'+esc(e.intro||'רעיון מחסידות שפוגש את החיים שלך. פותחים, חושבים ולוקחים משהו להמשך.')+'</p><div class="card-bottom"><span class="points-tag">'+esc(e.questionCount)+' שאלות באתגר</span><a href="#lesson/'+esc(e.id)+'">'+status+' ↖</a></div></div></article>';
}
function heroArt(){return '<div class="hero-art" aria-label="עיצוב חוברת בפנים, גיליון מי מחליט עליי"><div class="art-orbit"></div><span class="art-star" aria-hidden="true">✳</span><div class="cover"><div class="cover-top"><span class="cover-brand">בפנים</span><span>גיליון לדוגמה · 01</span></div><h2>מי<br>מחליט<br>עליי?</h2><div class="door" aria-hidden="true"></div><div class="cover-bottom">דברים ששווה לפתוח<br>מבית טעמו וראו</div></div><div class="sticker">רגע, יש פה משהו.</div><div class="sticker bottom">פותחים מחשבה ↗</div></div>'}
function home(){
 const courses=state.account?.exams||state.catalog?.exams||[];
 const intro=state.account?'<section class="section"><div class="dashboard-hero"><div><div class="eyebrow">טוב שחזרת, '+esc(state.account.participant.name)+'</div><h1>ממשיכים לפתוח<br>דברים טובים.</h1><p>השאלות שלך, ההתקדמות שלך, והדבר הבא שמחכה לך.</p><a class="btn dark" href="#challenges">לאתגר הבא ↖</a></div><a class="wallet-card" href="#account"><span>מה שצברת עד עכשיו</span><strong>'+number(state.account.participant.balance)+'</strong><span>נקודות בפנים · לחשבון שלך בלבד</span></a></div></section>':'<section class="hero"><div class="hero-copy"><div class="eyebrow">חסידות. החיים שלך. מקום לשאלות.</div><h1>יש בך יותר.<br>בוא לגלות <em>מה.</em></h1><p>'+copy.homeText+'<br>רעיונות מחסידות על כל מה שקורה אצלך בפנים.</p><div class="button-row">'+button(copy.start+' ↖','register','dark')+'<a class="btn outline" href="#learn">קודם מציצים</a></div><div class="hero-note"><span>✳</span>'+copy.invitation+'</div></div>'+heroArt()+'</section>';
 return intro+'<div class="marquee" aria-hidden="true"><span>פותחים שאלות</span><b>✳</b><span>מגלים כוחות</span><b>✳</b><span>חושבים בעצמנו</span><b>✳</b><span>לוקחים לחיים</span><b>✳</b><span>בפנים</span></div><section class="section"><div class="section-head"><div><div class="eyebrow">משהו ששווה כמה דקות שלך</div><h2>מה פותחים היום?</h2><p>רגע של מחשבה. זווית שלא חשבת עליה.</p></div><a class="text-btn" href="#learn">לכל התכנים ↖</a></div>'+(courses.length?'<div class="grid">'+courses.slice(0,3).map(courseCard).join('')+'</div>':empty('עוד דברים טובים בדרך.','הצוות מכין את התכנים הראשונים. אפשר לפתוח חשבון ולהיות מוכנים.'))+'</section><section class="section"><div class="story-strip"><div><div class="eyebrow">איך זה עובד כאן?</div><h2>פותחים את הראש.<br>לוקחים משהו לחיים.</h2><p>בפנים מחברים רעיונות מחסידות לשאלות שמעסיקות אותך: בחירות, חברים, ביטחון עצמי וכל מה שביניהם.</p>'+button('יש פה מקום בשבילי ↖',state.account?'challenges':'register','white')+'</div><div class="story-steps"><div class="step"><span class="step-number">1</span><div><strong>פותחים עניין</strong><p>קוראים רעיון קצר שפוגש משהו מהחיים שלך.</p></div></div><div class="step"><span class="step-number">2</span><div><strong>בוחנים את זה</strong><p>עונים על אתגר קצר ובודקים מה נשאר איתך.</p></div></div><div class="step"><span class="step-number">3</span><div><strong>הרווחת את זה</strong><p>צוברים נקודות לפי כללי האתגר ובוחרים מההטבות הזמינות.</p></div></div></div></div></section>';
}
function library(challenges=false){
 const list=state.account?.exams||state.catalog?.exams||[];
 return '<div class="page-title"><div class="eyebrow">'+(challenges?'עוד צעד משלך':'דברים ששווה לפתוח')+'</div><h1>'+(challenges?copy.challenges:copy.library)+'</h1><p>'+(challenges?'קראת? חשבת? בוא נראה מה לקחת מזה. ההתקדמות נשמרת בחשבון שלך.':'מי מחליט עליי? למה אני צריך שיאהבו אותי? ואיך הופכים כעס לכוח? כאן מתחילים לפתוח.')+'</p></div>'+(challenges?'<section class="section"><div class="request-summary"><strong>קיבלת חוברת?</strong><p>סורקים את ה-QR שבגב החוברת, או מקלידים כאן את הקוד שמתחתיו.</p><input id="bcode" class="code-input" placeholder="קוד מהחוברת" autocomplete="off" dir="ltr"> '+button('לאתגר ↖','redeem-code')+'</div></section>':'')+'<section class="section">'+(list.length?'<div class="grid">'+list.map(courseCard).join('')+'</div>':empty(copy.empty,'האתגרים והתכנים הזמינים יופיעו כאן.'))+'</section>';
}
function lesson(eid){
 const e=(state.account?.exams||state.catalog?.exams||[]).find(e=>e.id===eid);
 if(!e)return '<section class="section">'+empty('התוכן הזה עוד לא כאן.','אפשר לחזור לספרייה ולבחור משהו אחר.')+'</section>';
 const a=state.account?.attempts?.find(a=>a.examId===eid),open=e.opensAt<=new Date().toISOString()&&e.closesAt>new Date().toISOString();
 return '<article class="lesson"><a class="text-btn" href="#learn">→ לכל התכנים</a><div class="lesson-head"><div class="eyebrow">'+esc(e.durationMinutes||5)+' דקות של מחשבה · '+esc(e.week)+'</div><h1>'+esc(e.headline||e.title)+'</h1><p>'+esc(e.intro||'')+'</p></div><div class="lesson-text">'+esc(e.body||'התוכן המלא יעלה לכאן בקרוב. אפשר לחזור ולבדוק בהמשך.')+'</div><div class="lesson-end"><h3>מה לקחת מזה?</h3><p>'+(a?.completed?'כבר השלמת את האתגר הזה. אפשר להציץ בתוצאה שלך.':open?'אתגר קצר על מה שקראת. לפני שמתחילים נראה לך איך הוא עובד.':'האתגר אינו פתוח כרגע. מועד הסגירה: '+fmt(e.closesAt))+'</p>'+((open||a?.completed)?button(a?.completed?'לתוצאה שלי ↖':a?copy.resume+' ↖':'יאללה, לאתגר ↖','start','dark','data-id="'+esc(e.id)+'"'):'')+'</div></article>';
}
function rewards(){
 const rewards=state.account?.benefits||state.catalog?.benefits||[];
 return '<div class="page-title"><div class="eyebrow">ההתקדמות שלך שווה משהו</div><h1>'+copy.rewards+'</h1><p>הנקודות שצברת, הבחירה שלך. כאן נמצאות ההטבות הזמינות במודול בפנים.</p>'+(state.account?'<span class="tag">יש לך '+number(state.account.participant.balance)+' נקודות לבחירה</span>':'<button class="text-btn" data-action="login">נכנסים לחשבון כדי לראות כמה צברת ↖</button>')+'</div><section class="section">'+(rewards.length?'<div class="grid">'+rewards.map(b=>'<article class="reward-card"><div class="reward-icon" aria-hidden="true">'+(b.kind==='card'?'▤':b.kind==='meal'?'✳':'↗')+'</div><span class="tag">'+esc(b.merchant)+'</span><h3 style="margin-top:18px">'+esc(b.title)+'</h3><p>'+esc(b.branch||'לפי פרטי ההטבה')+'</p><div class="reward-price">'+number(b.cost)+' <small>נקודות ליחידה</small></div><p class="minor-note">אפשר להזמין עד '+esc(fmt(b.closesAt))+'</p>'+button('זה בשבילי ↖','reward','dark','data-id="'+esc(b.id)+'"')+'</article>').join('')+'</div>':empty('ההטבות הבאות בדרך.','יופיעו כאן רק הטבות ורשתות שהוגדרו במיוחד לבפנים.'))+'</section>';
}
const statuses={pending:'ההזמנה נקלטה',exported:'בטיפול אצל החנות',completed:'הושלמה',cancelled:'בוטלה והנקודות הוחזרו',failed:'הצוות בודק מה קרה'};
function account(){
 if(!state.account)return '<section class="section">'+empty('נכנסים ומגלים מה כבר פתחת.','החשבון שומר את ההתקדמות והנקודות שלך.')+'<div class="button-row" style="justify-content:center;margin-top:25px">'+button(copy.start,'login')+'</div></section>';
 const a=state.account,orders=a.orders||[];
 return '<div class="page-title"><div class="eyebrow">המקום שלך בפנים</div><h1>טוב שאתה כאן, '+esc(a.participant.name)+'.</h1><p>ההתקדמות שלך נשמרת. וכל צעד הוא שלך.</p><div class="subnav"><a class="btn outline" href="#account">החשבון שלי</a><a class="btn outline" href="#orders">ההזמנות שלי</a><button class="btn outline" data-action="contact">מדברים על זה</button><button class="text-btn" data-action="logout">יציאה מהחשבון</button></div></div><section class="section"><div class="profile-grid"><div class="box"><h3>'+copy.wallet+'</h3><div class="wallet-card" style="background:#d9ecbb;margin-bottom:20px"><span>נקודות זמינות למימוש</span><strong>'+number(a.participant.balance)+'</strong></div>'+(a.ledger.length?a.ledger.slice(0,25).map(l=>'<div class="ledger-item"><div>'+esc(l.reason)+'<small>'+esc(fmt(l.createdAt))+'</small></div><strong dir="ltr" class="'+(l.delta>=0?'plus':'minus')+'">'+(l.delta>0?'+':'')+number(l.delta)+'</strong></div>').join(''):'<p>האתגר הראשון מחכה לך. מכאן מתחילים לצבור.</p>')+'</div><div class="box"><h3>מדברים על זה</h3><p>משהו לא ברור? יש לך שאלה? הצוות כאן בשבילך.</p>'+button('פותחים שיחה ↖','contact','outline')+'<div style="margin-top:25px">'+(a.messages.length?a.messages.map(m=>'<div class="message"><strong>'+esc(m.subject)+'</strong><p>'+esc(m.body)+'</p>'+(m.reply?'<div class="reply"><small>הצוות ענה לך</small><p>'+esc(m.reply)+'</p></div>':'<small class="muted">ההודעה אצלנו. נחזור אליך כאן בחשבון.</small>')+'</div>').join(''):'<p class="minor-note">הפניות והתשובות שלך מופיעות רק בחשבון שלך.</p>')+'</div></div></div></section>';
}
function orders(){
 if(!state.account)return account();
 return '<div class="page-title"><h1>מה בחרת לעצמך?</h1><p>ההזמנות שלך, המצב שלהן וכל מה שצריך למימוש.</p></div><section class="section">'+(state.account.orders.length?state.account.orders.map(o=>{const b=JSON.parse(o.snapshot),canCancel=o.status==='pending'&&!o.exportedAt&&b.closesAt>new Date().toISOString();return '<article class="order-row"><div><h3>'+esc(b.title)+' × '+o.quantity+'</h3><p>'+esc(b.merchant)+' · '+o.total+' נקודות · '+esc(fmt(o.createdAt))+'</p>'+(b.kind!=='card'&&o.status!=='cancelled'?'<small>קוד מימוש · מוסרים בחנות לפי ההנחיות</small><strong class="order-code" dir="ltr">'+esc(o.code)+'</strong>':'')+'</div><span class="order-status '+esc(o.status)+'">'+esc(statuses[o.status]||o.status)+'</span>'+(canCancel?button('ביטול והחזרת נקודות','cancel','outline','data-id="'+esc(o.id)+'"'):'')+'</article>'}).join(''):empty('עדיין לא בחרת הטבה.','כשמזמינים משהו עם הנקודות, הוא יופיע כאן.'))+'</section>';
}
function quiz(){
 const a=state.attempt;if(!a)return '<div class="loading">פותחים את האתגר…</div>';
 if(a.completed)return '<section class="result"><div class="result-symbol" aria-hidden="true">✳</div><div class="eyebrow">האתגר הושלם ונשמר</div><h1>'+copy.complete+'</h1><p>עצרת, חשבת והשלמת עוד צעד. זה כבר שלך.</p><div class="result-points"><strong>'+number(a.score)+'</strong> נקודות נזקפו לחשבון שלך</div><div class="button-row"><a class="btn dark" href="#rewards">מה אפשר לבחור? ↖</a><a class="btn outline" href="#learn">פותחים עוד משהו</a></div>'+(a.settings.showCorrect?'<div style="text-align:right;margin-top:40px">'+a.questions.map(q=>'<div class="box" style="margin-bottom:14px"><h3>'+esc(q.text)+'</h3><p>התשובה: '+esc(q.options[q.correct])+'</p><p>'+esc(q.explanation||'')+'</p></div>').join('')+'</div>':'')+'</section>';
 const n=Math.min(state.questionIndex,a.questions.length-1),all=a.settings.layout==='all';
 const questionHTML=(q,i)=>'<div class="question"><small>שאלה '+(i+1)+' מתוך '+a.total+' · '+q.points+' נקודות</small><h2>'+esc(q.text||'האזינו לשאלה')+'</h2>'+(q.audioKey?'<div class="media-warning">לשאלה הזאת יש הקלטה. נדרשת כתובת שמע זמינה באתר; אי אפשר לענות עד לחיבור ההקלטה.</div>':'')+q.options.map((o,j)=>'<button class="answer '+(a.choices[q.id]===j?'selected':'')+'" data-action="answer" data-q="'+esc(q.id)+'" data-choice="'+j+'" '+(state.saving||q.audioKey&&!q.text?'disabled':'')+'><b>'+(j+1)+'</b><span>'+esc(o)+'</span></button>').join('')+'</div>';
 const ready=a.answered===a.total;
 return '<section class="quiz '+(all?'all-questions':'')+'"><div class="quiz-header"><a href="#challenges">→ לכל האתגרים</a><span>'+a.answered+' מתוך '+a.total+' תשובות נשמרו</span></div><div class="progress"><i style="width:'+(a.answered/a.total*100)+'%"></i></div>'+(a.settings.answerMode==='review'?'<div class="question-map">'+a.questions.map((q,i)=>'<button class="'+(Object.hasOwn(a.choices,q.id)?'filled ':'')+(n===i?'current':'')+'" data-action="question" data-index="'+i+'" aria-label="מעבר לשאלה '+(i+1)+'">'+(i+1)+'</button>').join('')+'</div>':'<div class="media-warning">באתגר הזה כל תשובה ננעלת ברגע ששולחים אותה. אי אפשר לחזור ולשנות.</div>')+(all?a.questions.map(questionHTML).join(''):questionHTML(a.questions[n],n))+'<div class="quiz-nav">'+(!all&&a.settings.answerMode==='review'?button('→ הקודמת','prev','outline',(n===0?'disabled':'')):'<span></span>')+((!all&&n<a.total-1&&a.settings.answerMode==='review')?button('לשאלה הבאה ←','next','dark'):a.settings.answerMode==='review'?button(copy.submit+' ↖','submit','dark',(!ready||state.saving?'disabled':'')):'')+'</div><p class="save-state">'+(state.saving?'רגע, שומרים את התשובה…':a.settings.answerMode==='review'?'התשובות שבחרת נשמרו. אפשר לשנות אותן עד ההגשה הסופית.':'התשובות נשמרות וננעלות מיד. אפשר לצאת ולחזור לשאלות שעוד לא נענו.')+'</p></section>';
}
function field(label,name,type='text',required=true,hint=''){return '<label class="field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" '+(required?'required':'')+' autocomplete="'+(type==='password'?'current-password':'off')+'">'+(hint?'<small>'+hint+'</small>':'')+'</label>'}
function showModal(body){$('#modal-body').innerHTML=body;modal.showModal();setTimeout(()=>$('#modal-body input')?.focus(),30)}
function auth(mode='login'){
 const reg=mode==='register';
 showModal('<h2 id="modal-title">'+(reg?'יש פה מקום בשבילך.':'טוב שחזרת.')+'</h2><p>'+(reg?'עוד רגע ויש לך מקום משלך — עם התכנים, האתגרים וההתקדמות שלך.':'נכנסים וממשיכים מאיפה שעצרנו.')+'</p><form data-form="'+mode+'">'+(reg?field('איך קוראים לך?','name','text',true,'אפשר גם שם שבו נוח לך שנפנה אליך.'):'')+field('שם משתמש','username','text',true,'אותיות או ספרות, בלי רווחים. אין צורך בתעודת זהות.')+field('סיסמה','password','password',true,reg?'לפחות 8 תווים. אפשר לשלב אותיות ומספרים.':'')+'<div class="form-error" hidden></div><button class="btn dark full" type="submit">'+(reg?'פותחים חשבון ↖':'נכנסים פנימה ↖')+'</button></form><div class="dialog-bottom">'+(reg?'כבר יש לך חשבון? <button class="auth-switch" data-action="login">נכנסים כאן</button>':'פעם ראשונה כאן? <button class="auth-switch" data-action="register">פותחים חשבון</button>')+'</div><p class="minor-note" style="margin-top:20px">פרטי החשבון וההתקדמות נשמרים לצורך הפעילות. לשאלות או בקשת מחיקה אפשר לפנות לצוות.</p>');
}
function requireMember(){if(state.account)return true;auth();return false}
async function start(eid){
 if(!requireMember())return;
 const e=state.account.exams.find(e=>e.id===eid),existing=state.account.attempts.find(a=>a.examId===eid);
 const begin=async()=>{const r=await api('start',{examId:eid});state.attempt=r.data;state.questionIndex=r.data.settings.answerMode==='locked'?Math.min(r.data.answered,r.data.total-1):0;modal.close();location.hash='quiz/'+eid;render();};
 if(existing){await begin();return}
 if(e?.needsCode){showModal('<h2 id="modal-title">מקלידים את הקוד מהחוברת</h2><p>'+esc(e.title)+' נפתח רק עם הקוד האישי שמודפס בגב החוברת שלך.</p><div class="request-summary"><input class="bcode-in" dir="ltr" placeholder="XXXX-XXXX" autocomplete="off"></div>'+button('פתיחת האתגר ↖','redeem-code','dark'));return}
 showModal('<h2 id="modal-title">רגע לפני שפותחים.</h2><p>'+esc(e?.title||'האתגר שלך')+'</p><div class="request-summary"><strong>'+esc(e?.questionCount||'')+' שאלות</strong><p>'+(e?.webSettings?.answerMode==='locked'?'כל תשובה ננעלת מיד. ממשיכים מהשאלות שלא נענו אם יוצאים באמצע.':'אפשר לעבור בין שאלות ולשנות תשובות עד ההגשה הסופית.')+'</p><p>נקודות נזקפות רק בסיום. אחרי ההגשה לא משפרים את הציון.</p></div>'+button('הבנתי, בוא נתחיל ↖','confirm-start','dark','data-id="'+esc(eid)+'"'));
}
async function action(el){
 const a=el.dataset.action;notice('');
 if(a==='login'||a==='register'){auth(a);return}
 if(a==='close-modal'){modal.close();return}
 if(a==='mobile-menu'){$('.header nav').classList.toggle('mobile-open');return}
 if(a==='challenges'){location.hash='challenges';return}
 if(a==='privacy'){showModal('<h2 id="modal-title">החשבון שלך, במקום בטוח.</h2><p>אנחנו שומרים את שם המשתמש, השם שבחרת, תשובות האתגרים, הנקודות וההזמנות כדי להפעיל את התוכנית.</p><p>כשמזמינים הטבה, הפרטים הנדרשים למימוש מועברים לבית העסק שמטפל בה. הפניות האישיות זמינות לך ולצוות המורשה.</p><p>לבקשת עיון, תיקון או מחיקת חשבון אפשר לפנות לצוות מתוך החשבון. נוסח מדיניות מלא ופרטי הגוף המפעיל יושלמו לפני פתיחת האתר לקהל.</p>'+button('פנייה לצוות','contact'));return}
 if(a==='logout'){await api('logout',{});state.account=null;state.attempt=null;location.hash='home';render();toast('יצאת מהחשבון. נתראה בפנים.');return}
 if(a==='redeem-code'){const v=(el.closest('.modal,dialog')?.querySelector('.bcode-in')||$('#bcode'))?.value.trim();if(!v)return;sessionStorage.setItem('bcode',v);if(!requireMember())return;modal.close?.();await redeemPending();return}
 if(a==='start'){await start(el.dataset.id);return}
 if(a==='confirm-start'){const r=await api('start',{examId:el.dataset.id});state.attempt=r.data;state.questionIndex=0;modal.close();location.hash='quiz/'+el.dataset.id;render();return}
 if(a==='answer'){
  if(state.saving)return;state.saving=true;
  try{const t=state.attempt,r=await api('choice',{attemptId:t.id,questionId:el.dataset.q,choice:Number(el.dataset.choice),revision:t.revision});state.attempt=r.data;if(r.data.settings.answerMode==='locked')state.questionIndex=Math.min(r.data.answered,r.data.total-1);if(r.data.completed)await refresh();}
  catch(e){if(e.status===409)state.attempt=await api('attempt?id='+encodeURIComponent(state.attempt.id));throw e}
  finally{state.saving=false;render()}return;
 }
 if(a==='next'){state.questionIndex++;render();return}
 if(a==='prev'){state.questionIndex=Math.max(0,state.questionIndex-1);render();return}
 if(a==='question'){state.questionIndex=Number(el.dataset.index);render();return}
 if(a==='submit'){showModal('<h2 id="modal-title">סגור על התשובות?</h2><p>אחרי ההגשה התשובות ננעלות והנקודות נזקפות פעם אחת. אפשר עוד לעבור עליהן לפני שמחליטים.</p><div class="button-row">'+button(copy.submit,'confirm-submit','dark')+button(copy.review,'close-modal','outline')+'</div>');return}
 if(a==='confirm-submit'){const t=state.attempt,r=await api('submit',{attemptId:t.id,revision:t.revision});state.attempt=r.data;await refresh();modal.close();render();return}
 if(a==='reward'){
  if(!requireMember())return;
  const b=state.account.benefits.find(b=>b.id===el.dataset.id);if(!b)return;
  showModal('<h2 id="modal-title">זה בשבילך?</h2><p>'+esc(b.title)+' · '+esc(b.merchant)+'</p><form data-form="order"><input type="hidden" name="benefitId" value="'+esc(b.id)+'"><input type="hidden" name="requestKey" value="'+crypto.randomUUID()+'"><label class="field"><span>כמה יחידות?</span><input name="quantity" type="number" min="1" max="99999" value="1" required data-cost="'+b.cost+'"></label><div class="request-summary"><strong id="order-total">'+number(b.cost)+' נקודות</strong><p>יתרה זמינה: '+number(state.account.participant.balance)+' נקודות</p></div><p class="minor-note">אישור ייצור הזמנה וינכה נקודות. אפשר לבטל רק לפני סגירת ההזמנות ולפני ההעברה לביצוע. מסירה בחנות מתבצעת במלואה בפעם אחת.</p>'+(b.kind==='card'?'<p class="minor-note">נדרש כרטיס שמקושר לרשת הזאת. אפשר לקשר אותו מהחשבון.</p>':'')+'<div class="form-error" hidden></div><button class="btn dark full" type="submit">מאשר, זה בשבילי ↖</button></form>');return;
 }
 if(a==='cancel'){showModal('<h2 id="modal-title">לבטל את ההזמנה?</h2><p>אם ההזמנה עדיין פתוחה לביטול, הנקודות יחזרו לחשבון שלך.</p>'+button('כן, לבטל ולהחזיר נקודות','confirm-cancel','dark','data-id="'+esc(el.dataset.id)+'"'));return}
 if(a==='confirm-cancel'){await api('cancel',{orderId:el.dataset.id});await refresh();modal.close();render();toast('ההזמנה בוטלה. הנקודות שוב אצלך.');return}
 if(a==='contact'){
  if(!requireMember())return;
  showModal('<h2 id="modal-title">מדברים על זה.</h2><p>שאלה על התוכן? משהו בנקודות לא מסתדר? ספר לנו.</p><form data-form="message">'+field('על מה מדברים?','subject')+'<label class="field"><span>מה תרצה שנדע?</span><textarea name="body" required></textarea></label><div class="form-error" hidden></div><button class="btn dark full" type="submit">שולחים לצוות ↖</button></form>');return
 }
 if(a==='card'){if(!requireMember())return;showModal('<h2 id="modal-title">מחברים את הכרטיס שלך.</h2><form data-form="card">'+field('שם הרשת, כפי שמופיע בהטבה','network')+field('מספר כרטיס','number')+'<div class="form-error" hidden></div><button class="btn dark full">שמירת כרטיס</button></form>');return}
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();
 if(el.disabled)return;
 action(el).catch(err=>{const box=modal.open?$('#modal-body .form-error'):null;if(box){box.textContent=err.message;box.hidden=false}else notice(err.message)});
});
document.addEventListener('input',e=>{const input=e.target;if(input.matches('input[name=quantity][data-cost]'))$('#order-total').textContent=number(Number(input.value)*Number(input.dataset.cost))+' נקודות'});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('[data-form]'))return;event.preventDefault();
 const submit=form.querySelector('button[type=submit],button:not([type])'),err=form.querySelector('.form-error');
 const data=Object.fromEntries(new FormData(form)),kind=form.dataset.form;
 if(submit)submit.disabled=true;if(err)err.hidden=true;
 try{
  if(kind==='login'||kind==='register'){await api(kind,data);await refresh();modal.close();location.hash='home';render();toast(kind==='register'?'עכשיו אתה בפנים. טוב שהגעת.':'טוב שחזרת.')}
  if(kind==='order'){data.quantity=Number(data.quantity);await api('order',data);await refresh();modal.close();location.hash='orders';render();toast('ההזמנה אצלנו. פרטי המימוש מחכים בחשבון שלך.')}
  if(kind==='message'){await api('message',data);await refresh();modal.close();location.hash='account';render();toast('ההודעה אצלנו. התשובה תחכה לך כאן בחשבון.')}
  if(kind==='card'){await api('card',data);await refresh();modal.close();toast('הכרטיס שלך נשמר להטענות הבאות.')}
 }catch(e){if(err){err.textContent=e.message;err.hidden=false}else notice(e.message)}
 finally{if(submit)submit.disabled=false}
});
async function render(){
 renderNav();const r=route(),[page,arg]=r.split('/');
 if(page==='quiz'&&!state.attempt){
  if(!state.account){main.innerHTML=account();return}
  const a=state.account.attempts.find(a=>a.examId===arg);
  if(a){try{state.attempt=await api('attempt?id='+encodeURIComponent(a.id));state.questionIndex=state.attempt.settings.answerMode==='locked'?Math.min(state.attempt.answered,state.attempt.total-1):0}catch(e){notice(e.message)}}else{main.innerHTML=library(true);return}
 }
 main.innerHTML=page==='home'?home():page==='learn'?library():page==='challenges'?library(true):page==='lesson'?lesson(arg):page==='rewards'?rewards():page==='account'?account():page==='orders'?orders():page==='quiz'?quiz():page==='manage'?'<section class="section">'+empty('ניהול מודול בפנים','כניסה למנהל דרך /bifnim/admin.html. נתוני המודול מופרדים מהקו הטלפוני.')+'<a class="btn dark" href="/bifnim/admin.html">לניהול המודול ↖</a></section>':home();
 if(page==='account'&&state.account){const btn=document.createElement('button');btn.className='btn outline';btn.dataset.action='card';btn.textContent='קישור כרטיס להטענה';main.querySelector('.subnav')?.append(btn)}
}
window.addEventListener('hashchange',()=>{$('.header nav').classList.remove('mobile-open');notice('');render();window.scrollTo(0,0)});
modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
try{await refresh();await render();if(pendingCode&&!state.account){notice('כדי להתחיל את האתגר מהחוברת, נכנסים או נרשמים. הקוד שמור.');auth()}}catch(e){notice(e.message);main.innerHTML=home()+'<section class="section">'+empty('פותחים את האתר בקרוב.','החיבור לנתונים עדיין לא זמין. התצוגה הזאת מציגה את שפת האתר בלבד.')+'</section>'}
