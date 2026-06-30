# הוראות פריסה (Deployment)

## פריסה לייצור

### 1. הכנה לפני פריסה

ודא שביצעת את כל הבדיקות המפורטות במסמך TESTING.md.

### 2. בנייה

```bash
npm run build
```

זה יבנה את ה-frontend לתיקיית `frontend/dist` ואת ה-backend לתיקיית `backend/dist`.

### 3. גיבוי מסד נתונים

לפני כל פריסה, צור גיבוי של מסד הנתונים:

```bash
# אם משתמשים ב-Supabase
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# אם משתמשים ב-Neon
# השתמש בממשק הניהול של Neon ליצירת גיבוי
```

### 4. הגדרת משתני סביבה בייצור

ודא שכל משתני הסביבה מוגדרים בשרת הייצור:
- `DATABASE_URL` - כתובת מסד נתונים בייצור
- `JWT_SECRET` - מפתח סודי חזק
- `YEMOT_API_USERNAME` - שם משתמש ימות המשיח
- `YEMOT_API_PASSWORD` - סיסמת ימות המשיח
- `PORT` - פורט (ברירת מחדל: 8080)
- `NODE_ENV` - `production`
- `FRONTEND_URL` - כתובת ה-frontend בייצור

### 5. הרצה בייצור

```bash
npm start
```

### 6. שימוש ב-Process Manager

מומלץ להשתמש ב-PM2 לניהול התהליך:

```bash
# התקן PM2
npm install -g pm2

# הרץ את האפליקציה
pm2 start npm --name "tamu" -- start

# שמור את התהליך
pm2 save

# הגדר הפעלה אוטומטית
pm2 startup
```

## פלטפורמות פריסה

### Render

1. חבר את המאגר ל-Render
2. הגדר Web Service עם:
   - Build Command: `npm run build` (מתקין אוטומטית תלויות ב-root, frontend ו-backend)
   - Start Command: `npm start`
   - Environment Variables: הגדר את כל משתני הסביבה
3. הקובץ `render.yaml` כבר מוגדר לפריסה כשירות יחיד מהשורש

### Railway

1. חבר את המאגר ל-Railway
2. הגדר את משתני הסביבה
3. Railway יזהה אוטומטית את הפרויקט ויבנה אותו

### VPS (שרת וירטואלי פרטי)

```bash
# התקן Node.js ו-Nginx
sudo apt update
sudo apt install nodejs npm nginx

# העתק את הקבצים לשרת
scp -r . user@server:/var/www/tamu

# התקן תלויות
cd /var/www/tamu
npm install --production

# הגדר Nginx reverse proxy
sudo nano /etc/nginx/sites-available/tamu
```

קובץ Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# אפשר את האתר
sudo ln -s /etc/nginx/sites-available/tamu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## HTTPS

השתמש ב-Certbot להגדרת HTTPS:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## ניטור

בדוק את הלוגים:

```bash
# אם משתמשים ב-PM2
pm2 logs tamu

# לוגים בקבצים
tail -f logs/combined.log
tail -f logs/error.log
```
