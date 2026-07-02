# אפיון שדרוג אזור אישי מפותח - CRM מלא לנבחן

**תאריך:** 1 ביולי 2026  
**סטטוס:** טיוטה לאישור

---

## 1. סקירת מצב נוכחי

### 1.1 מה קיים כיום

**מסד נתונים (Prisma Schema):**
- `User` - משתמש עם טלפון, שם מלא, תאריך הרשמה
- `ExamSession` - סשני מבחן עם ציון, נקודות שהרוויח, תשובות
- `Exam` - מבחן עם כותרת, שאלות, חוקי ניקוד, הטבות
- `ExamRewardRule` - חוקי ניקוד (ציון מינימלי → נקודות)
- `Benefit` - הטבות כלליות עם עלות בנקודות
- `ExamBenefit` - קישור רבים-לרבים בין מבחן להטבות

**API Endpoints קיימים:**
- `GET /api/exams/me/history` - מחזיר היסטוריית מבחנים עם נקודות והטבות זמינות

**Frontend קיים:**
- `PersonalAreaPage` - מציג:
  - יתרת נקודות כוללת
  - מספר מבחנים שבוצעו
  - הטבות זמינות (ספירה בלבד)
  - רשימת מבחנים עם ציונים, נקודות, והטבות

### 1.2 פערים מזוהים

| פער | תיאור | חומרה |
|------|--------|--------|
| **אין מערכת מימוש הטבות** | ההטבות מוצגות אבל אין אפשרות לממש אותן בפועל | גבוה |
| **אין היסטוריית מימושים** | אין מעקב אחרי אילו הטבות מומשו ומתי | גבוה |
| **חסרה טבלת UserRedemption** | אין טבלה שתחבר בין User ל-Benefit עם תאריך מימוש | גבוה |
| **אין endpoint למימוש הטבות** | אין API לבקשת מימוש הטבה | גבוה |
| **אין ולידציה של נקודות** | אין בדיקה אם למשתמש מספיק נקודות לפני מימוש | בינוני |
| **היסטוריית מבחנים בסיסית** | חסר פירוט מעמיק, סטטיסטיקות, ניתוח | בינוני |
| **אין סטטיסטיקות ותובנות** | אין גרפים, ממוצעים, ניתוח ביצועים | נמוך |
| **אין ניהול הטבות למנהל** | המנהל לא יכול לראות מי מימש מה | נמוך |

---

## 2. דרישות עסקיות לשדרוג

### 2.1 יעדים עיקריים

1. **מערכת מימוש הטבות מלאה** - אפשרות לנבחן לממש הטבות תמורת נקודות
2. **היסטוריית מימושים מלאה** - מעקב אחרי כל מימוש עם פרטים מלאים
3. **היסטוריית מבחנים מעמיקה** - פירוט מלא של כל מבחן עם סטטיסטיקות
4. **חוויית משתמש CRM** - ממשק פשוט וקל לשימוש כמו מערכת CRM
5. **ניהול מלא למנהל** - ראייה ושליטה בכל המימושים

### 2.2 סיפורי משתמש

**נבחן:**
- אני רוצה לראות את כל ההטבות הזמינות לי
- אני רוצה לממש הטבה תמורת נקודות שצברתי
- אני רוצה לראות את היסטוריית המימושים שלי
- אני רוצה לראות פירוט מלא של כל מבחן שביצעתי
- אני רוצה לראות סטטיסטיקות וניתוח ביצועים שלי

**מנהל:**
- אני רוצה לראות את כל המימושים שבוצעו
- אני רוצה לראות אילו הטבות פופולריות
- אני רוצה לנהל את ההטבות הזמינות
- אני רוצה לראות נתונים סטטיסטיים על המשתמשים

---

## 3. ארכיטקטורת מסד נתונים מוצעת

### 3.1 טבלאות חדשות להוספה

#### UserRedemption
```prisma
model UserRedemption {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  benefitId   String
  benefit     Benefit  @relation(fields: [benefitId], references: [id], onDelete: Cascade)
  pointsUsed  Int      // נקודות שנוצלו
  status      String   @default("pending") // pending, approved, rejected, completed
  notes       String?  // הערות מהמנהל
  redeemedAt  DateTime @default(now())
  processedAt DateTime?
  processedBy String?  // מזהה מנהל שאישר/דחה
  
  @@unique([userId, benefitId, redeemedAt])
  @@index([userId])
  @@index([benefitId])
  @@index([status])
}
```

#### User (עדכון)
```prisma
model User {
  id              String           @id @default(uuid())
  phone           String           @unique
  fullName        String?
  totalPoints     Int              @default(0) // סיכום נקודות כולל
  availablePoints Int              @default(0) // נקודות זמינות (לא מומשו)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  examSessions    ExamSession[]
  redemptions     UserRedemption[]
}
```

### 3.2 עדכונים לטבלאות קיימות

#### Benefit (עדכון)
```prisma
model Benefit {
  id          String           @id @default(uuid())
  title       String
  description String?
  costPoints  Int
  isActive    Boolean          @default(true) // האם ההטבה פעילה
  category    String?          // קטגוריה לסיווג
  imageUrl    String?          // תמונה להטבה
  maxUses     Int?             // מקסימום שימושים כולל (null = ללא הגבלה)
  currentUses Int              @default(0) // כמות שימושים נוכחית
  validFrom   DateTime?        // תאריך תחילת תוקף
  validUntil  DateTime?        // תאריך סיום תוקף
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  exams       ExamBenefit[]
  redemptions UserRedemption[]
}
```

#### ExamSession (עדכון)
```prisma
model ExamSession {
  id           String        @id @default(uuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  examId       String
  exam         Exam          @relation(fields: [examId], references: [id])
  score        Int?
  earnedPoints Int           @default(0)
  answers      Json
  isCompleted  Boolean       @default(false)
  startedAt    DateTime      @default(now())
  completedAt  DateTime?
  timeSpent    Int?          // זמן ביצוע בשניות
  deviceInfo   String?       // מידע על המכשיר
}
```

### 3.3 תרשים קשרים (ERD)

```
User (1) ----< (N) ExamSession
User (1) ----< (N) UserRedemption
Benefit (1) --< (N) UserRedemption
Exam (1) ----< (N) ExamBenefit ----< (N) Benefit
```

---

## 4. API Endpoints מוצעים

### 4.1 Endpoints לנבחן

#### היסטוריית מבחנים מורחבת
```
GET /api/exams/me/history
Response: {
  totalPoints: number,
  availablePoints: number,
  averageScore: number,
  totalExams: number,
  exams: [{
    sessionId: string,
    examId: string,
    examTitle: string,
    score: number,
    earnedPoints: number,
    startedAt: string,
    completedAt: string,
    timeSpent: number,
    studyProgram?: { id, title },
    questionStats: {
      total: number,
      correct: number,
      incorrect: number,
      skipped: number
    }
  }]
}
```

#### הטבות זמינות
```
GET /api/benefits/available
Response: [{
  id: string,
  title: string,
  description: string,
  costPoints: number,
  category: string,
  imageUrl: string,
  canRedeem: boolean,
  reason?: string // למה לא ניתן לממש
}]
```

#### מימוש הטבה
```
POST /api/benefits/:benefitId/redeem
Body: {}
Response: {
  redemptionId: string,
  status: "pending" | "approved",
  message: string
}
```

#### היסטוריית מימושים
```
GET /api/benefits/my-redemptions
Response: [{
  id: string,
  benefit: {
    id: string,
    title: string,
    description: string,
    costPoints: number
  },
  pointsUsed: number,
  status: "pending" | "approved" | "rejected" | "completed",
  redeemedAt: string,
  processedAt?: string,
  notes?: string
}]
```

#### סטטיסטיקות אישיות
```
GET /api/exams/me/stats
Response: {
  totalExams: number,
  averageScore: number,
  bestScore: number,
  worstScore: number,
  totalPoints: number,
  totalRedemptions: number,
  pointsSpent: number,
  recentActivity: [{
    type: "exam" | "redemption",
    title: string,
    date: string,
    points?: number
  }]
}
```

### 4.2 Endpoints למנהל

#### כל המימושים
```
GET /api/admin/redemptions
Query: ?status=pending&userId=xxx&benefitId=xxx
Response: [{
  id: string,
  user: {
    id: string,
    phone: string,
    fullName: string
  },
  benefit: {
    id: string,
    title: string,
    costPoints: number
  },
  pointsUsed: number,
  status: string,
  redeemedAt: string,
  processedAt?: string,
  notes?: string
}]
```

#### אישור/דחיית מימוש
```
PATCH /api/admin/redemptions/:redemptionId
Body: {
  status: "approved" | "rejected",
  notes?: string
}
Response: {
  message: string
}
```

#### סטטיסטיקות כלליות
```
GET /api/admin/stats
Response: {
  totalUsers: number,
  totalExams: number,
  totalRedemptions: number,
  totalPointsDistributed: number,
  totalPointsSpent: number,
  popularBenefits: [{
    benefitId: string,
    title: string,
    redemptionCount: number
  }],
  topUsers: [{
    userId: string,
    fullName: string,
    totalPoints: number
  }]
}
```

#### ניהול הטבות
```
POST /api/admin/benefits
Body: {
  title: string,
  description: string,
  costPoints: number,
  category?: string,
  imageUrl?: string,
  maxUses?: number,
  validFrom?: string,
  validUntil?: string
}

PATCH /api/admin/benefits/:benefitId
Body: { /* same as create */ }

DELETE /api/admin/benefits/:benefitId
```

---

## 5. עיצוב Frontend מוצע

### 5.1 מבנה דף אזור אישי מחודש

```
┌─────────────────────────────────────────────────┐
│  האזור האישי שלי          [יציאה] [דף הבית]  │
├─────────────────────────────────────────────────┤
│  כרטיסיות סיכום (3 כרטיסיות בשורה)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ נקודות  │ │ מבחנים │ │ מימושים│        │
│  │  1,250   │ │   15    │ │    8    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│  טאבים: [היסטוריית מבחנים] [הטבות] [מימושים] │
├─────────────────────────────────────────────────┤
│                                                 │
│  תוכן דינמי לפי הטאב הנבחר                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5.2 טאב היסטוריית מבחנים

- **רשימת מבחנים** עם:
  - כותרת מבחן
  - ציון (עם צבע ירוק/אדום לפי הציון)
  - נקודות שהרוויח
  - תאריך ביצוע
  - זמן ביצוע
  - כפתור "פרטים נוספים" לפתיחת מודאל

- **מודאל פרטי מבחן** עם:
  - סטטיסטיקות: נכון/לא נכון/דילג
  - גרף ציונים לאורך זמן
  - רשימת שאלות עם סטטוס (נכון/לא נכון)
  - הטבות שהרוויח מהמבחן

### 5.3 טאב הטבות

- **רשימת הטבות זמינות** בכרטיסיות:
  - תמונה/אייקון
  - כותרת
  - תיאור
  - עלות בנקודות
  - כפתור "ממש" (מופעל אם יש מספיק נקודות)
  - סטטוס (זמין/לא זמין/נגמר)

- **סינון** לפי קטגוריות
- **מיון** לפי עלות/פופולריות

### 5.4 טאב מימושים

- **טבלת מימושים** עם:
  - שם הטבה
  - עלות בנקודות
  - סטטוס (בהמתנה/אושר/נדחה/הושלם)
  - תאריך בקשה
  - תאריך עיבוד
  - הערות מהמנהל

- **צבעי סטטוס:**
  - צהוב - בהמתנה
  - ירוק - אושר
  - אדום - נדחה
  - כחול - הושלם

### 5.5 חוויית משתמש

- **עיצוב נקי ומודרני** עם רווחים גדולים
- **אנימציות עדינות** במעברים
- **הודעות הצלחה/שגיאה** ברורות
- **טעינה מהירה** עם loading states
- **רספונסיביות מלאה** למובייל
- **תמיכה בעברית (RTL)**

---

## 6. לוגיקה עסקית

### 6.1 מימוש הטבה

1. **בדיקת זמינות:**
   - האם ההטבה פעילה?
   - האם נמצא בתוקף תאריכים?
   - האם לא חרג ממקסימום שימושים?

2. **בדיקת נקודות:**
   - האם למשתמש יש מספיק נקודות זמינות?

3. **יצירת מימוש:**
   - יצירת רשומה ב-UserRedemption עם status=pending
   - ניכוי נקודות מ-availablePoints
   - שמירת הפניה למימוש

4. **עיבוד (למנהל):**
   - המנהל רואה את כל המימושים הממתינים
   - יכול לאשר/לדחות עם הערות
   - באישור: status=approved, processedAt=now
   - בדחייה: status=rejected, החזרת נקודות

### 6.2 חישוב נקודות

- **totalPoints** = סכום כל הנקודות שהרוויח ממבחנים
- **availablePoints** = totalPoints - סכום נקודות שמומשו
- עדכון אוטומטי בכל:
  - סיום מבחן (הוספת נקודות)
  - מימוש הטבה (ניכוי נקודות)
  - דחיית מימוש (החזרת נקודות)

### 6.3 ולידציות

- **מימוש הטבה:**
  - לא ניתן לממש אותה הטבה פעמיים באותו יום
  - לא ניתן לממש אם אין מספיק נקודות
  - לא ניתן לממש הטבה לא פעילה

- **מבחן:**
  - טוקן יכול לשמש רק פעם אחת
  - משתמש לא יכול לבצע אותו מבחן פעמיים עם אותו טוקן

---

## 7. שלבי יישום מוצעים

### שלב 1: עדכון מסד נתונים
- [ ] הוספת טבלה UserRedemption
- [ ] עדכון טבלה User (הוספת שדות נקודות)
- [ ] עדכון טבלה Benefit (הוספת שדות ניהול)
- [ ] עדכון טבלה ExamSession (הוספת timeSpent)
- [ ] הרצת Prisma migration
- [ ] עדכון נתונים קיימים (חישוב נקודות)

### שלב 2: Backend API
- [ ] יצירת controller benefits.ts
- [ ] יצירת controller redemptions.ts
- [ ] יצירת controller stats.ts
- [ ] עדכון controller exams.ts (הרחבת היסטוריה)
- [ ] יצירת routes חדשים
- [ ] עדכון middleware auth (אם נדרש)
- [ ] בדיקות API

### שלב 3: Frontend
- [ ] עיצוב מחדש PersonalAreaPage
- [ ] יצירת רכיבים: ExamHistoryCard, BenefitCard, RedemptionTable
- [ ] יצירת services: benefits.ts, redemptions.ts, stats.ts
- [ ] הוספת מודאלים לפרטי מבחן
- [ ] הוספת טאבים וניווט
- [ ] עיצוב ואנימציות
- [ ] בדיקות רספונסיביות

### שלב 4: Admin
- [ ] עדכון AdminPage עם טאב מימושים
- [ ] יצירת רכיב RedemptionApproval
- [ ] הוספת סטטיסטיקות למנהל
- [ ] יצירת טופס ניהול הטבות
- [ ] בדיקות

### שלב 5: בדיקות והשקה
- [ ] בדיקות אינטגרציה מלאות
- [ ] בדיקות משתמש אמיתי
- [ ] תיקונים ושיפורים
- [ ] עדכון תיעוד
- [ ] השקה

---

## 8. סיכום והמלצות

### 8.1 ערך עסקי

- **שיפור ערך לנבחן:** הנבחן רואה ערך אמיתי בנקודות שצובר
- **הגברת מעורבות:** מערכת הטבות מגבירה מוטיבציה לבצע מבחנים
- **שליטה וניהול:** המנהל רואה תמונה מלאה של כל הפעילות
- **נתונים לשיפור:** סטטיסטיקות מאפשרות שיפור המערכת

### 8.2 סיכונים והתמודדות

- **סיכון:** ניצול לא נכון של המערכת
  - **התמודדות:** ולידציות חזקות, עיבוד ידני של מימושים

- **סיכון:** עומס על המנהל
  - **התמודדות:** אוטומציה של מימושים מסוימים, סף אוטומטי לאישור

- **סיכון:** בעיות ביצועים
  - **התמודדות:** אינדקסים מתאימים, caching

### 8.3 המלצות ליישום

1. **התחל בשלב 1 ו-2** - תשתית מסד נתונים ו-API
2. **עבוד איטרטיבית** - כל שלב עם בדיקות
3. **התחל ב-MVP** - מימוש הטבות בסיסי ללא אישור מנהל
4. **הוסף ניהול מנהל** לאחר שה-MVP עובד
5. **אסוף משוב** ממשתמשים לפני השלמות

---

## 9. נספחים

### 9.1 דוגמאות JSON

#### דוגמת מימוש הטבה
```json
{
  "redemptionId": "uuid-123",
  "status": "pending",
  "message": "הבקשה התקבלה וממתינה לאישור מנהל"
}
```

#### דוגמת סטטיסטיקות אישיות
```json
{
  "totalExams": 15,
  "averageScore": 78.5,
  "bestScore": 95,
  "worstScore": 60,
  "totalPoints": 1250,
  "totalRedemptions": 8,
  "pointsSpent": 450,
  "recentActivity": [
    {
      "type": "exam",
      "title": "מבחן תורה שבועי",
      "date": "2026-06-30T10:00:00Z",
      "points": 50
    },
    {
      "type": "redemption",
      "title": "כרטיס לאירוע",
      "date": "2026-06-28T15:30:00Z",
      "points": -100
    }
  ]
}
```

### 9.2 מילון מונחים

- **נקודות זמינות:** נקודות שלא מומשו עדיין
- **מימוש:** פעולה של המרת נקודות להטבה
- **הטבה:** פרס/זכות שניתן לקבל תמורת נקודות
- **סשן מבחן:** ביצוע יחיד של מבחן
- **חוק ניקוד:** כלל שקובע כמה נקודות מקבלים על ציון מסוים

---

**מסמך זה מוגש לאישור לפני תחילת היישום**
