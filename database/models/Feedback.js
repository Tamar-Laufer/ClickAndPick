'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const FEEDBACK_TYPES = ['question', 'recommendation'];

/**
 * Feedback — רשומת "תיבת פניות" ציבורית. כל אחד (ללא התחברות) יכול לשלוח
 * `question` (הערה / פנייה לאדמין) או `recommendation` (המלצה / הוכחה חברתית)
 * דרך טופס ה-footer, עם שם + אימייל בלבד. האדמין קורא הכול בתיבה; רק המלצות ניתן
 * להפוך ל-`isApprovedForHomepage` כדי שיופיעו בקרוסלת דף הבית הציבורית.
 */
const feedbackSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name is too short'],
      maxlength: [80, 'Name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: { values: FEEDBACK_TYPES, message: '{VALUE} is not a valid feedback type' },
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [5, 'Message is too short'],
      maxlength: [1000, 'Message is too long'],
    },
    // משמעותי רק עבור `recommendation`; האדמין בוחר אילו מוצגות לציבור
    isApprovedForHomepage: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  // createdAt (+ updatedAt) מסופקים ע"י timestamps — משמשים ל"חדש ביותר קודם"
  { timestamps: true },
);

// מסלול מהיר לשאילתה הציבורית "המלצות מאושרות, החדשות קודם"
feedbackSchema.index({ type: 1, isApprovedForHomepage: 1, createdAt: -1 });

feedbackSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
});

const Feedback = model('Feedback', feedbackSchema);
Feedback.TYPES = FEEDBACK_TYPES;

module.exports = Feedback;
