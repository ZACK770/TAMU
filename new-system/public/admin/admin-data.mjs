const COLLECTIONS=Object.freeze({
 participants:['participants'],participantIds:['ids'],participantsByIds:['participants'],templates:['templates'],
 exams:['exams'],benefits:['benefits'],orders:['orders'],merchantOrders:['orders'],broadcasts:['broadcasts'],
 broadcastRecipients:['recipients'],booklets:['booklets','exams','files'],bookletCodes:['codes'],stands:['stands','distributions','operators','booklets'],funnel:['rows','stands'],operatorHome:['booklets'],
 messages:['messages'],institutions:['institutions'],institutionQueue:['queue'],staff:['staff'],audit:['audit']
});
export function validateAdminData(action,data){
 if(!data||typeof data!=='object'||(COLLECTIONS[action]||[]).some(name=>!Array.isArray(data[name])))
  throw new Error('השרת החזיר תשובה חסרה והנתונים לא נטענו. נסו לרענן את המסך. לא בוצע שינוי בנתונים.');
 return data;
}
