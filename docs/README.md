# מערכת למידה ומבחנים - התקנה והרצה

## דרישות מוקדמות

- Node.js גרסה 18 ומעלה
- PostgreSQL בענן (Supabase / Neon / Render)
- חשבון בימות המשיח (לשליחת SMS)

## התקנה

1. שכפל את המאגר:
```bash
git clone <repository-url>
cd TAMU
```

2. התקן את התלויות:
```bash
npm install
```

3. הגדר משתני סביבה:
```bash
cp .env.example .env
```

ערוך את הקובץ `.env` עם הערכים הנכונים:
- `DATABASE_URL` - כתובת מסד הנתונים PostgreSQL
- `JWT_SECRET` - מפתח סודי ל-JWT
- `YEMOT_API_USERNAME` - שם משתמש לימות המשיח
- `YEMOT_API_PASSWORD` - סיסמה לימות המשיח

4. הגדר את Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. התקן תלויות Frontend:
```bash
cd frontend
npm install
cd ..
```

## הרצה בפיתוח

```bash
npm run dev
```

זה מנקה את `frontend/dist`, בונה את ה-frontend מחדש, מאמת שאין ב-build הפניות API מוחלטות לפורטים ישנים, ואז מריץ שרת Express יחיד שמגיש גם את האתר וגם את ה-API מאותו פורט. ה-API זמין תחת `/api/*`, וכל שאר הנתיבים מוגשים מה-frontend.

## בנייה לייצור

```bash
npm run build
```

## הרצה בייצור

```bash
npm start
```

## ניהול מסד נתונים

```bash
# פתח את Prisma Studio
npm run prisma:studio

# הרץ migrations
npm run prisma:migrate

# אכלס מסד נתונים עם נתוני דוגמה
cd backend
npx tsx ../scripts/seed-db.ts
```

## בדיקת API

```bash
npm run test:api
```

## מבנה הפרויקט

```
TAMU/
├── backend/          # שרת Node.js + Express
├── frontend/         # אפליקציית React
├── docs/            # תיעוד
├── scripts/         # סקריפטים
└── logs/            # לוגים
```
