'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const TARGET_MODELS = ['User', 'Item'];

/**
 * Review — צד אחד של דירוג דו-כיווני "כפול-סמוי" (double-blind).
 *  - השוכר מדרג את הפריט   → targetModel 'Item', targetId = item._id
 *  - הבעלים מדרג את השוכר  → targetModel 'User', targetId = renter._id
 * הביקורות נשארות `isPublic:false` עד ששני הצדדים מגישים (או שחלון הזמן פג), מה
 * שמונע ביקורות נקמה.
 */
const reviewSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // הפניה דינמית: targetId מצביע על User או על Item
    targetModel: { type: String, required: true, enum: TARGET_MODELS },
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'targetModel' },

    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },

    rating: { type: Number, required: true, min: [1, 'Rating must be 1–5'], max: [5, 'Rating must be 1–5'] },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },

    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ביקורת אחת לכל מבקר לכל הזמנה (משתמש לא יכול לדרג את אותה הזמנה פעמיים)
reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });
// שליפות מהירות עבור האגרגציה למטה
reviewSchema.index({ targetModel: 1, targetId: 1, isPublic: 1 });

reviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) { delete ret._id; return ret; },
});

/**
 * חישוב מחדש של ממוצע היעד מתוך הביקורות הציבוריות שלו וכתיבתו חזרה.
 * משתמש ב-pipeline אגרגציה:
 *   $match  → רק ביקורות ציבוריות עבור היעד המדויק הזה
 *   $group  → ממוצע שדה ה-`rating` וספירת המסמכים
 * ואז שומר את הממוצע המעוגל + הספירה על ה-User או ה-Item.
 */
reviewSchema.statics.recalculate = async function recalculate(targetModel, targetId) {
  const oid = new mongoose.Types.ObjectId(targetId);

  const [result] = await this.aggregate([
    { $match: { targetModel, targetId: oid, isPublic: true } },
    { $group: { _id: '$targetId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const average = result ? Math.round(result.avg * 10) / 10 : 0; // ספרה עשרונית אחת
  const count = result ? result.count : 0;

  if (targetModel === 'Item') {
    await mongoose.model('Item').findByIdAndUpdate(targetId, { averageRating: average, totalReviews: count });
  } else {
    await mongoose.model('User').findByIdAndUpdate(targetId, { averageRenterRating: average, totalRenterReviews: count });
  }

  return { average, count };
};

reviewSchema.statics.TARGET_MODELS = TARGET_MODELS;

module.exports = model('Review', reviewSchema);
