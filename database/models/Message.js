'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const MESSAGE_TYPES = ['text', 'audio'];

/**
 * Message — הודעת צ'אט בודדת בין שני משתמשים.
 *
 * שירות הזמן-אמת (C++, פורט 8080) מעביר את ההודעה בזמן אמת ונשאר stateless;
 * המסמך הזה הוא מקור האמת היחיד להיסטוריה, כך שרענון דף או נמען שאינו מחובר
 * אינם גורמים לאובדן הודעות.
 */
const messageSchema = new Schema({
  sender:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true, maxlength: 4000 },
  type:      { type: String, enum: MESSAGE_TYPES, default: 'text' },
  createdAt: { type: Date, default: Date.now },
});

// שליפת היסטוריית שיחה היא $or על שני הכיוונים, ממוינת לפי createdAt.
// כל סעיף ב-$or נושא sender+recipient מדויקים, כך שאינדקס מורכב יחיד משרת את שניהם
// ומספק כבר מיון לפי createdAt — בלי שלב sort בזיכרון.
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

messageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) { delete ret._id; return ret; },
});

messageSchema.statics.MESSAGE_TYPES = MESSAGE_TYPES;

module.exports = model('Message', messageSchema);
