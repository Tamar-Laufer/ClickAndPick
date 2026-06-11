'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

/**
 * Category — טקסונומיית הפריטים בניהול אדמין (נערכת מלוח הניהול במקום enum קשיח).
 *
 *   value  מזהה יציב שנשמר על כל Item (למשל 'TOOLS', או תווית עברית עבור קטגוריות
 *          שאדמין הוסיף). ייחודי — שגיאת מפתח כפול 11000 ממופה ל-409 נקי ע"י
 *          ה-error handler הגלובלי.
 *   label  טקסט תצוגה בעברית המוצג בטפסים, מסננים וכרטיסי פריט.
 *   color  אסימון צבע לתגית (coral / teal / green / blue / butter …).
 *   icon   מזהה אייקון אופציונלי שה-UI יכול לפענח.
 *
 * פריטים מצביעים על קטגוריה דרך ה-`value` שלה. ארבע הקטגוריות המקוריות
 * (TOOLS / CAMPING / EVENTS / CLEANING) נזרעות כדי שפריטים קיימים ימשיכו
 * להיפתר; ראו database/seeds/categories.js.
 */
const COLORS = ['coral', 'teal', 'green', 'blue', 'butter'];

const categorySchema = new Schema(
  {
    value: {
      type: String,
      required: [true, 'Category value is required'],
      unique: true,
      trim: true,
      minlength: [1, 'Category value is too short'],
      maxlength: [60, 'Category value is too long'],
    },
    label: {
      type: String,
      required: [true, 'Category label is required'],
      trim: true,
      minlength: [1, 'Category label is too short'],
      maxlength: [60, 'Category label is too long'],
    },
    color: {
      type: String,
      enum: { values: COLORS, message: '{VALUE} is not a valid colour' },
      default: 'coral',
    },
    icon: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

categorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
});

const Category = model('Category', categorySchema);
Category.COLORS = COLORS;

module.exports = Category;
