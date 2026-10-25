export function phoneEntry({showModal,options,api,esc,legacy,onVerified,context}){
 let request=null,formData=null,resendAt=0;
 const body=()=>document.querySelector('#modal-body');
 const error=(form,message)=>{const box=form.querySelector('.form-error');box.textContent=message;box.hidden=!message};
 const label={sms:'SMS',whatsapp:'WhatsApp'};
 function phone(){
  showModal('<div class="entry-mark">↗</div><span class="entry-eyebrow">עוד רגע ואתם בפנים</span><h2 id="modal-title">'+esc(context||'נכנסים עם הטלפון')+'</h2><p>מספר טלפון, קוד קצר — וממשיכים. בלי לבחור שם משתמש או סיסמה.</p><form id="phone-entry"><label class="field"><span>מספר הטלפון שלך</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" dir="ltr" placeholder="0501234567" value="'+esc(formData?.phone||'')+'" required autofocus></label><label class="field"><span>איך לקרוא לך? <small>רשות</small></span><input name="name" autocomplete="given-name" maxlength="60" value="'+esc(formData?.name||'')+'" placeholder="אפשר להמשיך גם בלי שם"></label>'+(options.channels.length>1?'<label class="field"><span>לאן לשלוח את הקוד?</span><select name="channel">'+options.channels.map(c=>'<option value="'+c+'">'+label[c]+'</option>').join('')+'</select></label>':'<input type="hidden" name="channel" value="'+options.channels[0]+'">')+'<div class="form-error" role="alert" hidden></div><button class="btn dark full" type="submit">שלחו לי קוד כניסה</button></form><p class="entry-note">המספר ישמש לכניסה ולשמירת ההתקדמות שלך. במכשיר אישי לא צריך להזדהות מחדש בכל ביקור.</p><div class="dialog-bottom"><button class="text-btn" id="legacy-entry">יש לי חשבון עם סיסמה</button></div>');
  body().querySelector('#legacy-entry').onclick=legacy;
  body().querySelector('#phone-entry').onsubmit=async ev=>{
   ev.preventDefault();const form=ev.target,submit=form.querySelector('[type=submit]');formData=Object.fromEntries(new FormData(form));submit.disabled=true;submit.textContent='שולחים לך קוד…';error(form,'');
   try{request=await api('phone/request',formData);resendAt=Date.now()+request.retryAfter*1000;code()}catch(e){error(form,e.message);submit.disabled=false;submit.textContent='שלחו לי קוד כניסה'}
  };
 }
 function code(){
  showModal('<div class="entry-mark">✓</div><span class="entry-eyebrow">שלחנו לך קוד ב־'+label[request.channel]+'</span><h2 id="modal-title">מה הקוד שקיבלת?</h2><p>הקוד נשלח למספר <b dir="ltr">'+esc(request.phone)+'</b>. הוא תקף ל־5 דקות.</p><form id="phone-verify"><label class="field"><span>קוד בן 6 ספרות</span><input class="otp-input" name="code" inputmode="numeric" autocomplete="one-time-code" dir="ltr" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus></label><div class="form-error" role="alert" hidden></div><button class="btn dark full" type="submit">כניסה והמשך למבחן</button></form><div class="entry-links"><button class="text-btn" id="change-phone">תיקון מספר הטלפון</button><button class="text-btn" id="resend-code">לא הגיע? שליחה נוספת</button></div><p id="resend-info" class="minor-note" role="status">אפשר לבקש קוד נוסף אחרי דקה.</p>');
  body().querySelector('#change-phone').onclick=phone;
  body().querySelector('#resend-code').onclick=async ev=>{
   const remaining=Math.ceil((resendAt-Date.now())/1000);if(remaining>0){body().querySelector('#resend-info').textContent='אפשר לשלוח שוב בעוד '+remaining+' שניות.';return}
   ev.target.disabled=true;
   try{request=await api('phone/request',formData);resendAt=Date.now()+request.retryAfter*1000;code()}catch(e){body().querySelector('#resend-info').textContent=e.message;ev.target.disabled=false}
  };
  body().querySelector('#phone-verify').onsubmit=async ev=>{
   ev.preventDefault();const form=ev.target,submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent='בודקים את הקוד…';error(form,'');
   try{await api('phone/verify',{phone:request.phone,challengeId:request.challengeId,code:form.elements.code.value});await onVerified()}
   catch(e){error(form,e.message);submit.disabled=false;submit.textContent='כניסה והמשך למבחן'}
  };
 }
 phone();
}
