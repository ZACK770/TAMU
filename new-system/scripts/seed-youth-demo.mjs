import {saveYouthExam,saveYouthBenefit,youthDb,registerYouth} from '../lib/youth.mjs';
export async function seedYouthDemo(raw){
 const db=youthDb(raw),existing=await db.prepare("SELECT id FROM exams LIMIT 1").bind().first();if(existing)return;
 const base={week:'גיליון 01',track:'easy',kind:'sicha',opensAt:new Date(Date.now()-3600000).toISOString(),closesAt:new Date(Date.now()+30*86400000).toISOString(),questionCount:3,published:true,webSettings:{answerMode:'review',layout:'one',shuffle:true,showCorrect:true},durationMinutes:5};
 const lessons=[
 {title:'מי מחליט עליי?',materialKey:'choice-demo',accent:'lime',intro:'החבר׳ה? מה שיגידו? מה שבא לי עכשיו? בוא נבדוק מי מחזיק את השלט.',body:'מישהו זורק לך הערה. עוד לפני שהספקת לחשוב, כבר בא לך להחזיר. מוכר?\n\nבין מה שמרגישים לבין מה שעושים יש רגע קטן של בחירה. בחסידות לומדים שלא כל מחשבה שעוברת אצלנו חייבת להפוך למעשה. אפשר להרגיש כעס, ובכל זאת לבחור תגובה אחרת.\n\nזה לא אומר שאין לך כוח. להפך: הכוח הוא גם היכולת לעצור ולשאול לאן אתה רוצה לקחת אותו.\n\nלוקחים לחיים: בפעם הבאה שמשהו מקפיץ אותך, עצור לרגע. שאל את עצמך: התגובה הזאת באמת שלי, או שמישהו אחר לחץ לי על הכפתור?',questions:[
 {id:'choice-1',text:'מישהו הקפיץ אותך. איפה נמצאת הבחירה שלך?',options:['בדרך שבה אגיב','ביכולת למחוק מיד כל רגש','במה שכולם יחשבו עליי'],correct:0,points:10,explanation:'אי אפשר תמיד לבחור מה להרגיש ברגע הראשון. אפשר לעבוד על התגובה.'},
 {id:'choice-2',text:'לעצור לפני שמגיבים זה…',options:['לוותר על כל מה שחשוב לי','דרך להוביל את הכוח שלי','לתת לאחרים להחליט בשבילי'],correct:1,points:10,explanation:'עצירה יכולה לאפשר לך לבחור תגובה שמתאימה למה שחשוב לך.'},
 {id:'choice-3',text:'איזו שאלה יכולה לעזור ברגע של לחץ?',options:['איך אחזיר הכי מהר?','מי אשם בכל זה?','מה באמת אני רוצה לעשות כאן?'],correct:2,points:10,explanation:'השאלה מחזירה את המבט לבחירה שלך.'}
 ]},
 {title:'מי צריך שיאהבו אותו?',materialKey:'belonging-demo',accent:'violet',intro:'כולנו רוצים להיות חלק. השאלה היא מה אנחנו מוכנים לתת בשביל זה.',body:'להיות חלק מהחבר׳ה זה חשוב. להרגיש שיש לך מקום, שמקשיבים לך וששמחים לראות אותך — זה צורך אנושי.\n\nאבל מה קורה כשהמחיר של השייכות הוא לעשות משהו שבפנים אתה לא שלם איתו?\n\nמבט של חסידות מזכיר לנו שהערך של האדם עמוק יותר מתגובה שהוא מקבל מבחוץ. יש בך נשמה ויכולת לתת טוב שאף לייק לא יוצר ואף הערה לא מוחקת.\n\nלוקחים לחיים: תחשוב על אדם אחד שבחברתו אתה מרגיש בנוח להיות אתה. מה יש בקשר הזה שהיית רוצה להביא גם לקשרים אחרים?',questions:[
 {id:'belong-1',text:'מה יכול לתת תחושת שייכות טובה?',options:['קשר שמאפשר לי להיות עצמי','לעשות הכול כדי שיסכימו איתי','להעמיד פנים שאין לי דעה'],correct:0,points:10},
 {id:'belong-2',text:'הערך שלי נקבע רק לפי התגובות של אחרים?',options:['כן, תמיד','לא. יש בי ערך עמוק יותר','רק אם יש הרבה תגובות'],correct:1,points:10},
 {id:'belong-3',text:'איזה צעד אפשר לקחת לקשרים עם חברים?',options:['להתחרות על כל דבר','להתרחק מכולם','להקשיב ולתת מקום להיות שונים'],correct:2,points:10}
 ]},
 {title:'כעס הוא כוח. לאן לוקחים אותו?',materialKey:'energy-demo',accent:'orange',intro:'כשיש לך הרבה אש בפנים, אפשר ללמוד לאן לכוון אותה.',body:'לפעמים הכעס אומר לנו שמשהו באמת חשוב לנו. הוא נותן אנרגיה, אבל הוא לא תמיד נותן כיוון.\n\nאפשר להשתמש בכוח הזה כדי לפגוע. אפשר גם לקחת ממנו דחיפה כדי לשנות משהו לטובה: לדבר ברור, להציב גבול, לעזור למישהו או לתקן מצב.\n\nהעבודה הפנימית היא לא רק לשאול כמה כוח יש לי, אלא בשביל מה אני מפעיל אותו.\n\nלוקחים לחיים: בחר דבר שמרגיז אותך ושאתה יכול לשנות בו משהו קטן לטובה. מה הפעולה הראשונה שלך?',questions:[
 {id:'energy-1',text:'האם הרבה אנרגיה תמיד נותנת גם כיוון טוב?',options:['לא. צריך לבחור לאן לכוון אותה','כן, העיקר לפעול מהר','רק אם כועסים מספיק'],correct:0,points:10},
 {id:'energy-2',text:'מהי דוגמה להפיכת כוח למעשה טוב?',options:['לפגוע במי שהרגיז אותי','לעזור לתקן מצב שמפריע לי','להחליט שאין מה לעשות'],correct:1,points:10},
 {id:'energy-3',text:'איזו שאלה מתאימה לפני פעולה?',options:['איך כולם יראו שאני כועס?','כמה רעש אפשר לעשות?','בשביל מה אני מפעיל את הכוח הזה?'],correct:2,points:10}
 ]}
 ];
 for(const l of lessons)await saveYouthExam(raw,{...base,...l},'local-demo');
 await saveYouthBenefit(raw,{title:'מנת פיצה · הטבת בדיקה',merchant:'רשת נוער לדוגמה',branch:'סניף בדיקה בלבד',kind:'meal',cost:20,faceValue:0,opensAt:base.opensAt,closesAt:base.closesAt,redeemUntil:new Date(Date.now()+31*86400000).toISOString(),delivery:'portal'},'local-demo');
 await saveYouthBenefit(raw,{title:'שובר לחנות · הטבת בדיקה',merchant:'חנות לדוגמה',kind:'voucher',cost:50,faceValue:25,opensAt:base.opensAt,closesAt:base.closesAt,redeemUntil:new Date(Date.now()+31*86400000).toISOString(),delivery:'export'},'local-demo');
}
