'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

/**
 * Item — פריט פיזי שבעלים מעמיד להשאלה לטווח קצר.
 * `imageUrl` מחזיק כתובת URL מאוחסנת בענן (למשל S3 / Cloudinary), לעולם לא בייטים גולמיים.
 */
const itemSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title is too short'],
      maxlength: [120, 'Title is too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description is too long'],
      default: '',
    },
    // הקטגוריה היא Category.value בניהול אדמין (ראו models/Category.js).
    // הקיום נבדק ב-itemsService מול אוסף ה-Category ביצירה/עדכון — לא enum סטטי
    // כאן, כדי שאדמינים יוכלו להוסיף קטגוריות.
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    dailyRate: {
      type: Number,
      required: [true, 'Daily rate is required'],
      min: [0, 'Daily rate cannot be negative'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    /**
     * מיקום האיסוף כ-GeoJSON Point, משמש לחיפוש "קרוב אליי".
     * `coordinates` הוא [longitude, latitude] (סדר GeoJSON — לא lat,lng).
     *
     * השדה אופציונלי: לא כל פריט עובר geocoding, ואינדקס 2dsphere פשוט מדלג על
     * מסמכים שאין להם מיקום. כשמיקום *כן* קיים, אנו מאמתים שיש בו בדיוק שני
     * מספרים בטווחי lng/lat תקינים, כדי שלעולם לא נאנדקס Point פגום.
     *
     * פרטיות: הקואורדינטות הגולמיות הן בית/נקודת האיסוף של הבעלים, ואסור שיוחזרו
     * אף פעם מהקטלוג הציבורי — ראו itemsService, שחושף רק מרחק מעוגל, לעולם לא את `location`.
     */
    location: {
      // אין כאן `default: 'Point'` בכוונה: ברירת מחדל הייתה יוצרת בכל פריט
      // `location: { type: 'Point' }` ריק (ללא coordinates), ואינדקס 2dsphere
      // דוחה Point ללא coordinates בעת ההכנסה. `type` נקבע במפורש רק כשמסופקות
      // קואורדינטות (ראו ה-service).
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: (v) =>
            Array.isArray(v) &&
            v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 && // קו אורך (longitude)
            v[1] >= -90 && v[1] <= 90, // קו רוחב (latitude)
          message: 'coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // דגל מחיקה רכה. לעולם לא מוחקים פריט באמת, כך שהזמנות וביקורות היסטוריות
    // ממשיכות להצביע על רשומה קיימת. פריטים מחוקים מסוננים מכל שאילתת
    // קטלוג/בעלים; הרשומה נשמרת לצורך שלמות הנתונים.
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // דירוג מצטבר (השוכרים מדרגים את הפריט)
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/* אינדקסים לדפוסי הגישה הנפוצים */
itemSchema.index({ category: 1, isActive: 1 }); // עיון בפריטים החיים של קטגוריה
itemSchema.index({ title: 'text', description: 'text' }); // חיפוש מילות מפתח
itemSchema.index({ location: '2dsphere' }); // חיפוש גאוגרפי "קרוב אליי" (ממיין מהקרוב לרחוק)
itemSchema.index({ averageRating: -1, totalReviews: -1 }); // מיון "מומלצים" לפי איכות (ראו itemsService.sortStage)

itemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    // פרטיות: קואורדינטות האיסוף הגולמיות לעולם לא יוצאות מהשרת. חיפוש "קרוב
    // אליי" חושף רק מרחק מעוגל (ראו itemsService.listNearby).
    delete ret.location;
    return ret;
  },
});

module.exports = model('Item', itemSchema);
