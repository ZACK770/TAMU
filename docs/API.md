# API Documentation

## Base URL

```
http://localhost:8080
```

## Authentication

רוב ה-endpoints דורשים JWT token ב-header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/send-code

שלח קוד אימות למספר טלפון.

**Body:**
```json
{
  "phone": "0500000000"
}
```

**Response (200):**
```json
{
  "message": "Code sent successfully",
  "expiresIn": 600
}
```

#### POST /api/auth/verify-code

אמת קוד OTP.

**Body:**
```json
{
  "phone": "0500000000",
  "code": "123456"
}
```

**Response (200) - משתמש קיים:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "phone": "0500000000",
    "fullName": "שם מלא"
  }
}
```

**Response (200) - משתמש חדש:**
```json
{
  "needsRegistration": true,
  "phone": "0500000000"
}
```

#### POST /api/auth/register

הרשם משתמש חדש.

**Body:**
```json
{
  "phone": "0500000000",
  "fullName": "שם מלא"
}
```

**Response (200):**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "phone": "0500000000",
    "fullName": "שם מלא"
  }
}
```

### Exams

#### POST /api/exams/verify-token

בדוק תקינות טוקן מבחן. ✅ דורש אימות.

**Body:**
```json
{
  "token": "123456"
}
```

**Response (200):**
```json
{
  "sessionId": "session-id",
  "exam": {
    "id": "exam-id",
    "title": "כותרת מבחן",
    "isRandom": false
  }
}
```

#### GET /api/exams/session/:sessionId/next-question

קבל את השאלה הבאה. ✅ דורש אימות.

**Response (200):**
```json
{
  "question": {
    "id": "question-id",
    "text": "טקסט שאלה",
    "answers": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"]
  }
}
```

**Response (200) - מבחן הסתיים:**
```json
{
  "completed": true
}
```

#### POST /api/exams/session/:sessionId/submit-answer

שלח תשובה לשאלה. ✅ דורש אימות.

**Body:**
```json
{
  "questionId": "question-id",
  "answerIndex": 0
}
```

**Response (200):**
```json
{
  "correct": true
}
```

#### POST /api/exams/session/:sessionId/complete

סיים את המבחן וחשב ציון. ✅ דורש אימות.

**Response (200):**
```json
{
  "score": 85,
  "correctCount": 17,
  "totalQuestions": 20
}
```

### Health

#### GET /api/health

בדוק בריאות השרת.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## שגיאות

כל שגיאות מחזירות פורמט אחיד:

```json
{
  "error": "Error message"
}
```

קודי שגיאה:
- `400` - בקשה לא תקינה
- `401` - לא מאומת
- `403` - איסור גישה
- `404` - לא נמצא
- `429` - יותר מדי בקשות (Rate Limit)
- `500` - שגיאת שרת
