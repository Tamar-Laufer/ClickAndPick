# Click & Pick ("ביחד") — סקירת ארכיטקטורה

מסמך התמצאות לקוד. נכתב כדי שתוכלי לקרוא את הפרויקט לפי הבנה, לא לפי סדר אלפביתי.
כל ההפניות הן `קובץ:שורה` — לחיצה תפתח אותן.

---

## 1. מה האפליקציה עושה

פלטפורמת **שיתוף/השכרת פריטים בין שכנים**. בעלים מפרסם פריט (`Item`), שכן מזמין אותו
לטווח תאריכים (`Booking`), הפלטפורמה גוזרת עמלה של 10%, ובסיום ההשכרה הצדדים מדרגים
זה את זה (`Review`). יש מנגנון **Trust Score** למשתמשים, אזור **אדמין**, חיפוש גאוגרפי
("לידי"), והתראות email אוטומטיות.

---

## 2. הסטאק

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React + Vite, React Router, Context API (אין Redux) |
| Backend | Node + Express |
| DB | MongoDB + Mongoose |
| Realtime | Socket.io (`req.io` זמין בכל בקשה) |
| Auth | JWT (bearer token) + bcrypt |
| תמונות | קבצים על דיסק (`/uploads`), ב-DB נשמר רק ה-URL |
| משימות מתוזמנות | `node-cron` (תזכורות החזרה) |

---

## 3. ארכיטקטורת ה-Backend — שכבות נקיות

זה הלב של הפרויקט, ושווה להפנים אותו פעם אחת כי **כל פיצ'ר בנוי באותה תבנית**:

```
HTTP → routes/ → controllers/ → services/ → models/ → MongoDB
         (דק)      (דק מאוד)    (כל הלוגיקה)  (סכמה)
```

### מי אחראי על מה

- **`routes/`** — רק מיפוי URL → controller + הצמדת middleware (אימות/הרשאה).
  ראי [server/routes/items.js](server/routes/items.js) — 29 שורות, אפס לוגיקה.
- **`controllers/`** — דקים בכוונה (16–48 שורות). מוציאים נתונים מ-`req`, קוראים ל-service,
  מחזירים JSON. ראי [server/controllers/itemsController.js](server/controllers/itemsController.js)
  — כל פונקציה היא 3 שורות. שימי לב ל-`asyncHandler` שעוטף כל אחת (סעיף 6).
- **`services/`** — **כאן נמצאת כל לוגיקת העסק** (itemsService 360 שורות, emailService 331).
  ולידציות, חישובי מחיר, בדיקת חפיפת תאריכים, חיפוש גאוגרפי, אכיפת בעלוּת.
- **`models/`** — סכמות Mongoose: שדות, ולידציה, אינדקסים, ומתודות עזר.

### הכלל המנחה
**Controller לעולם לא ניגש ל-DB ישירות, ו-Model לא יודע על HTTP.** אם תרצי להבין "מה
באמת קורה" בפיצ'ר — תקראי את ה-**service**, לא את ה-controller.

### דוגמה מלאה — יצירת פריט
```
POST /api/items
  → routes/items.js:22         verifyToken, ctrl.create
  → itemsController.js:35       item = itemsService.create(req.user.id, req.body)
  → itemsService.create(...)    ולידציה, בדיקת קטגוריה, גאוקודינג, שמירה
  → models/Item.js              הסכמה + אינדקסים
  → 201 { item }
```

---

## 4. זרימת האימות (Auth)

1. **התחברות** — [authService.js](server/services/authService.js) מאמת סיסמה מול
   `passwordHash` (bcrypt), מחזיר **JWT** עם `{ id, email, role }`.
2. **בצד הלקוח** — [AuthProvider.jsx](client/src/context/AuthProvider.jsx) שומר token +
   user ב-`localStorage` וקורא אותם **סינכרונית לפני הרינדור הראשון**
   ([AuthProvider.jsx:15-22](client/src/context/AuthProvider.jsx#L15-L22)) — כדי למנוע הבהוב
   "מחובר/לא מחובר".
3. **בכל בקשה מוגנת** — הלקוח שולח `Authorization: Bearer <token>`;
   [verifyToken.js](server/middleware/verifyToken.js) מאמת ומצמיד `req.user`.
4. **הרשאות** — [checkRole.js](server/middleware/checkRole.js) לנתיבי אדמין; בצד הלקוח
   `ProtectedRoute roles={['ADMIN']}` ([App.jsx:72](client/src/App.jsx#L72)).

> **נקודת תשומת לב:** הטוקן נשמר ב-localStorage (חשוף ל-XSS). מקובל בפרויקטים רבים, אבל
> אם תרצי להקשיח — httpOnly cookie. לא דחוף, רק לדעת.

---

## 5. ארכיטקטורת ה-Frontend

### היררכיית ה-Providers ([App.jsx:22-24](client/src/App.jsx#L22-L24))
```
AuthProvider           ← מי מחובר, token, login/logout
  CategoriesProvider   ← רשימת קטגוריות משותפת (ראי הרפקטור שעשינו)
    BrowserRouter      ← ניתוב
```
שני ה-Providers עוטפים את כל האפליקציה כי הנתונים שלהם **גלובליים** — כל מסך צריך לדעת
מי מחובר ומהן הקטגוריות.

### שכבת ה-API ([services/api.js](client/src/services/api.js))
**כל** קריאת רשת עוברת דרך `apiFetch()` — base URL, כותרות JSON, צירוף ה-token, וזריקת
`Error` עם הודעת השרת. קומפוננטה אף פעם לא קוראת ל-`fetch` ישירות (חוץ מהעלאת תמונה,
שצריכה multipart — מתועד שם בשורה 18).

### ארגון התיקיות
- **`pages/`** — מסך לכל route. העמודים הם **מתזמרים דקים**: הם מושכים את הנתונים
  מ-hook ומרכיבים תת-קומפוננטות, ולא מחזיקים לוגיקת fetch/חישוב בעצמם. למשל
  `ProfilePage` (210 שורות במקום 659) רק קורא ל-`useProfileData`/`useAvatarUpload`/
  `useProfileForm`/`usePasswordChange` ומרנדר את הקלפים מ-`components/profile/`.
- **`components/`** — מאורגנת ל**תיקיות-משנה לפי דומיין**:
  - `ui/` — גנרי לשימוש חוזר (Button, Modal, Loader, FormInput, ConfirmDialog,
    Avatar, ErrorBoundary, Marquee, Stars, Accordion).
  - `layout/` — שלד עמוד (TgNavbar, MiniFooter, ProtectedRoute).
  - `auth/`, `search/`, `item/`, `booking/`, `profile/`, `admin/`, `feedback/` —
    קומפוננטות ספציפיות לכל דומיין.
- **`context/`** — מצב גלובלי (Auth, Categories). הערה: כל context מפוצל ל-`Context.jsx`
  (האובייקט + ה-hook) ו-`Provider.jsx` (הקומפוננטה) כדי לספק את React Fast Refresh.
- **`hooks/`** — **כאן יושבת לוגיקת המסכים**: גנריים (`useAsyncAction`, `useFullBleed`,
  `useAuthForm`, `useCategoriesData`) ולפי מסך (`useProfileData`, `useAvatarUpload`,
  `useItemSearch`, `useGeoSearch`, `useItemDetail`, `useAdminDashboard`). הכלל:
  אם זה fetch, state או חישוב — זה hook, לא קומפוננטה.
- **`utils/`** — פונקציות טהורות (`fullName`, `priceParts`/`priceText`, `distanceLabel`).

---

## 6. נושאים חוצי-מערכת (כדאי להכיר לפני הצלילה)

- **טיפול שגיאות אחיד (Backend)** — `asyncHandler` ([כל controller](server/controllers/))
  עוטף פונקציות async כך ששגיאה זורמת ל-**error handler גלובלי** אחד
  ([index.js:85-105](server/index.js#L85-L105)), שממפה שגיאות Mongoose (ValidationError,
  CastError, duplicate key, Multer) לתשובות HTTP נקיות. **אין try/catch בכל קונטרולר.**
- **Realtime** — `io` מוצמד ל-`req.io` ([index.js:45](server/index.js#L45)), כך ש-service
  יכול לדחוף עדכון חי (למשל סטטוס הזמנה).
- **Cron** — [jobs/cronJobs.js](server/jobs/cronJobs.js) שולח תזכורת החזרה; ה-flag
  `returnReminderSentAt` ב-Booking מבטיח שכל השכרה תזכה לתזכורת **בדיוק פעם אחת**.
- **Email** — [emailService.js](server/services/emailService.js) (331 שורות) — אישורי
  הזמנה, איפוס סיסמה, תזכורות.
- **פרטיות מיקום** — קואורדינטות הבעלים **לעולם** לא יוצאות החוצה: `toJSON` מוחק את
  `location` ([Item.js:111-121](server/models/Item.js#L111-L121)), והחיפוש מחזיר רק מרחק
  מעוגל. שווה לקרוא את ההערות שם — זו החלטת עיצוב מודעת.

---

## 7. מודל הנתונים — הקשרים

```
User ──owns──>  Item  <──books──  Booking  ──by──> User (renter)
  │                                  │
  │                                  └──> Review (item review / renter review)
  └── trustScore, ratings

Category (admin-managed)  ──value──>  Item.category   (string, לא ObjectId!)
Feedback (המלצות באתר)
```

נקודות עדינות בסכמות ששווה לשים לב אליהן:
- **`Item.category` הוא string**, לא reference — הוא מצביע על `Category.value`. הקיום
  נבדק ב-service, לא ע"י enum, כדי שאדמין יוכל להוסיף קטגוריות
  ([Item.js:32-40](server/models/Item.js#L32-L40)).
- **Soft-delete** — פריט אף פעם לא נמחק באמת (`isDeleted`), כדי שהזמנות וביקורות
  היסטוריות ימשיכו להצביע על רשומה קיימת ([Item.js:92-97](server/models/Item.js#L92-L97)).
- **כסף מחושב בשרת בלבד** — `platformFee` / `ownerEarnings` אף פעם לא נסמכים מהלקוח
  ([Booking.js:43-57](server/models/Booking.js#L43-L57)).
- **Trust Score** — נוסחה משוקללת (איכות 70 / נפח 20 / אמינות 10) ב-
  [User.js:180-194](server/models/User.js#L180-L194). משתמש חדש מתחיל ב-50.

---

## 8. סדר קריאה מומלץ (אחרי המסמך הזה)

1. ✅ השלד — [server/index.js](server/index.js), [client/src/App.jsx](client/src/App.jsx)
   (כבר סקרנו אותם כאן).
2. **המודלים** — לפי תלות: `User` → `Item` → `Booking` → `Review` → `Category` → `Feedback`.
3. **פיצ'ר Items מקצה לקצה** — `routes/items.js` → `itemsController.js` →
   **`itemsService.js`** (זה הקובץ המרכזי — 360 שורות) → בצד הלקוח: `SearchResults.jsx` →
   `ItemPage.jsx` → `CreateItem.jsx`.
4. **פיצ'ר Bookings** — אותה תבנית; כאן נמצא חישוב המחיר ובדיקת חפיפת התאריכים.
5. השאר (reviews, feedback, admin, dashboard) — אותה תבנית בדיוק, יקראו מהר.

---

## 9. הערכה כללית

הקוד **מאורגן ומתועד היטב** — הפרדת שכבות נקייה, controllers דקים, business logic
מרוכז ב-services, והערות שמסבירות *למה* ולא רק *מה*. זה לא קוד של מתחילים.

דברים ששווה לשים אליהם לב בהמשך (לא באגים — נקודות למחשבה):
- **token ב-localStorage** — חשיפה ל-XSS (סעיף 4).
- **`emailService` ו-`itemsService` גדולים** — אם ימשיכו לגדול, אולי כדאי לפצל.
- **אין שכבת בדיקות נראית** — שווה לוודא אם יש `__tests__` / Jest, ואם לא — להוסיף
  לפחות לחישובי הכסף וה-Trust Score, שהם הקריטיים.
```
