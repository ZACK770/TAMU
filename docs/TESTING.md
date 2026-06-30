# הוראות בדיקה (Testing)

## בדיקות לפני פריסה

### בדיקות אוטומטיות

```bash
# בדיקת טיפוסים
npm run type-check

# בניית הפרויקט
npm run build

# בדיקת API endpoints
npm run test:api
```

### בדיקות ידניות

#### 1. בדיקת זרימת משתמש מלאה

1. הרץ את השרת בפיתוח:
```bash
npm run dev
```

2. פתח את הדפדפן ב-`http://localhost:5173`

3. בדוק את הזרימה:
   - דף הבית נטען כראוי
   - לחץ על "התחברות"
   - הכנס מספר טלפון (בפורמט ישראלי: 0500000000)
   - קבל קוד SMS (בפיתוח, בדוק בלוגים את הקוד)
   - הכנס את הקוד
   - אם משתמש חדש - השלם רישום
   - עבור למסך המבחן
   - הכנס טוקן מבחן (למשל: 123456)
   - ענה על השאלות
   - בדוק שהציון מוצג בסוף

#### 2. בדיקת אימות SMS

בפיתוח, תוכל לראות את הקוד בלוגים:
```bash
tail -f logs/combined.log
```

חפש הודעה כמו:
```
OTP code generated: 123456
```

#### 3. בדיקת רספונסיביות

- פתח את DevTools בדפדפן (F12)
- החלף למצב Mobile (Ctrl+Shift+M)
- בדוק את הממשק בגדלים שונים:
  - iPhone SE (375x667)
  - iPhone 12 Pro (390x844)
  - iPad (768x1024)
  - Desktop (1920x1080)

#### 4. בדיקת API באמצעות cURL

```bash
# Health check
curl http://localhost:8080/api/health

# Send code
curl -X POST http://localhost:8080/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"0500000000"}'

# Verify code (לאחר קבלת קוד)
curl -X POST http://localhost:8080/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"0500000000","code":"123456"}'
```

#### 5. בדיקת ביצועים

```bash
# בדיקת זמן תגובה
time curl http://localhost:8080/api/health

# בדיקת זיכרון ו-CPU
pm2 monit
```

#### 6. בדיקות אבטחה

```bash
# בדיקת CORS - נסה לגשת מ-domain אחר
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:8080/api/auth/send-code

# בדיקת Rate Limiting - שלח הרבה בקשות
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/auth/send-code \
    -H "Content-Type: application/json" \
    -d '{"phone":"0500000001"}'
done
# צפי לקבל 429 Too Many Requests אחרי 5 בקשות
```

## בדיקות אינטגרציה עם ימות המשיח

לפני פריסה לייצור, ודא:
- שהחשבון של ימות המשיח מאופשר
- שיש מספיק יתרה לשליחת SMS
- שה-API credentials נכונים

## בדיקת מסד נתונים

```bash
# פתח Prisma Studio
npm run prisma:studio

# בדוק שהטבלאות נוצרו כראוי:
# - User
# - Exam
# - Question
# - ExamToken
# - ExamSession
```

## רשימת בדיקה לפני פריסה

- [ ] כל הבדיקות האוטומטיות עוברות
- [ ] זרימת משתמש מלאה עובדת
- [ ] אימות SMS עובד
- [ ] ממשק רספונסיבי
- [ ] API endpoints מחזירים JSON תקין
- [ ] לוגים נרשמים כראוי
- [ ] מסד נתונים מחובר
- [ ] גיבוי מסד נתונים נוצר
- [ ] משתני סביבה מוגדרים לייצור
- [ ] HTTPS מוגדר (בייצור)
