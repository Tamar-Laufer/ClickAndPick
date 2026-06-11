'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema, model } = mongoose;

const ROLES = ['USER', 'ADMIN'];
const SALT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * User — משתמשים רגילים ומנהלי הפלטפורמה.
 * אבטחה:
 *  - השדה `passwordHash` מוגדר `select: false`, ולכן לעולם לא מוחזר כברירת מחדל.
 *    כדי לאמת התחברות שולפים עם `.select('+passwordHash')` ואז קוראים ל-
 *    `user.comparePassword(plain)`.
 *  - `toJSON` מסיר את ההאש ושדות פנימיים כדי שלא ידלפו בתשובות ה-API.
 */
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [60, 'First name is too long'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [60, 'Last name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_RE, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // לא נשלח ללקוח אלא אם נשלף במפורש
    },
    // ── איפוס סיסמה (תהליך "שכחתי סיסמה") ──
    // שומרים אך ורק hash מסוג SHA-256 של טוקן האיפוס, לעולם לא את הערך הגולמי, כך
    // שדליפת DB לא תאפשר לאפס חשבונות. שניהם `select: false` ולכן לא נטענים/
    // מוחזרים אלא אם שאילתה מבקשת אותם במפורש. תוקף הטוקן נבדק בצד השרת בעת המימוש.
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-()\s]{7,20}$/, 'Please provide a valid phone number'],
    },
    // כתובת URL ציבורית של תמונת הפרופיל (הועלתה דרך /uploads/image).
    // אופציונלי — כשהשדה ריק ה-UI מציג את האות הראשונה של השם.
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // כתובת קריאה שהמשתמש הקליד (אופציונלי). משמשת לגזירת defaultLocation דרך
    // geocoding ומוצגת למשתמש בפרופיל שלו.
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address is too long'],
      default: '',
    },
    /**
     * מיקום האיסוף ברירת-המחדל של המשתמש כ-GeoJSON Point, שיורש כל פריט שהוא
     * מפרסם ללא קואורדינטות משלו. אופציונלי — אותו מבנה ואותן אזהרות כמו
     * Item.location: אין ברירת מחדל ל-`type` הפנימי (Point ריק לא ניתן לאינדוקס/
     * שמירה), `coordinates` הוא [longitude, latitude], ונבדק רק כשהוא קיים. זהו
     * המיקום המדויק של המשתמש; פריטים מעתיקים ממנו גרסה מטושטשת (3 ספרות, ~100 מ'),
     * לעולם לא את הערך המדויק.
     */
    defaultLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          // מערך ריק/חסר נחשב כ"אין מיקום" כדי שלא יחסום שמירה (למשל עדכון אבטר
          // למשתמש עם defaultLocation ריק). רק מערך מאוכלס בפועל נבדק לטווחים.
          validator: (v) =>
            v == null ||
            v.length === 0 ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 && // קו אורך (longitude)
              v[1] >= -90 && v[1] <= 90), // קו רוחב (latitude)
          message: 'coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    role: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a supported role' },
      default: 'USER',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // מוניטין כשוכר (הבעלים מדרגים את התנהגות השוכר)
    averageRenterRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRenterReviews: { type: Number, default: 0, min: 0 },

    // ── ציון אמון (Trust Score, 0–100) ──
    // מוניטין מורכב המוצג בכל הפלטפורמה. משתמש חדש מתחיל ב-50 ניטרלי ונשאר כך עד
    // שהביקורת הציבורית הראשונה עליו מפעילה חישוב מחדש (ראו calculateTrustScore).
    // נשמר ב-DB כדי שניתן יהיה לקרוא אותו בלי אגרגציה מחדש בכל בקשה.
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    // מונה כולל של הזמנות שהגיעו ל-COMPLETED (מזין את רכיב ה"ניסיון")
    completedTransactions: { type: Number, default: 0, min: 0 },
    // הזמנות שהמשתמש ביטל אחרי שאושרו (מזין את רכיב ה"אמינות")
    cancelledTransactions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/* הסרת שדות רגישים / פנימיים מכל פלט מסודרר (serialised) */
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret._id;
    return ret;
  },
});

/* ── פונקציות עזר (instance & static) ── */

// גיבוב סיסמה גולמית והצבתה במסמך הזה (יש לקרוא לפני save).
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

// השוואת סיסמה מועמדת מול ההאש השמור בזמן קבוע (constant-time).
userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

// נוחות: גיבוב סיסמה ללא אובייקט קיים (למשל בעת יצירה).
userSchema.statics.hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

/**
 * חישוב מחדש של ציון האמון (0–100) של המשתמש משדות המוניטין הנוכחיים ושמירתו.
 * נועד להיקרא בכל פעם שאחד מהקלטים משתנה — כלומר כשביקורת שוכר על המשתמש הופכת
 * לציבורית, או כשמונה עסקאות שהושלמו/בוטלו מתעדכן.
 *
 * פירוק משוקלל:
 *   • איכות   (70 נק') — דירוג שוכר ממוצע מנורמל: (ממוצע / 5) * 70.
 *   • ניסיון  (20 נק') — 2 נק' לכל עסקה שהושלמה, עד תקרה של 20.
 *   • אמינות  (10 נק') — מתחיל ב-10, פחות 2 על כל ביטול לאחר אישור.
 *
 * הערה: זה מופעל רק אחרי שקיימת ביקורת ציבורית, ולכן משתמש חדש לגמרי שומר על 50
 * (במקום לצנוח ל-10 עם רכיב איכות ריק). מחזיר את הציון שנשמר.
 */
userSchema.methods.calculateTrustScore = async function calculateTrustScore() {
  const avgRating = Number(this.averageRenterRating) || 0; // 0–5
  const completed = Number(this.completedTransactions) || 0;
  const cancelled = Number(this.cancelledTransactions) || 0;

  const quality = (avgRating / 5) * 70; // 0–70
  const volume = Math.min(completed * 2, 20); // 0–20
  const reliability = Math.max(0, 10 - cancelled * 2); // 0–10

  const raw = quality + volume + reliability;
  this.trustScore = Math.max(0, Math.min(100, Math.round(raw))); // clamp + integer

  await this.save();
  return this.trustScore;
};

userSchema.statics.ROLES = ROLES;

module.exports = model('User', userSchema);
