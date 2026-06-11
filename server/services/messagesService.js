'use strict';

const { Message } = require('../../database/models');
const { ApiError } = require('../utils/errors');

/**
 * שמירת הודעה חדשה. השולח מגיע מהטוקן (לעולם לא מגוף הבקשה) כדי שלא ניתן יהיה
 * להתחזות; שאר השדות מסוננים ב-whitelist למניעת mass-assignment.
 */
async function send({ senderId, recipient, text, type }) {
  if (!recipient) throw new ApiError(400, 'נמען חסר');
  if (!text || !text.trim()) throw new ApiError(400, 'תוכן ההודעה חסר');

  const messageType = type || 'text';
  if (!Message.MESSAGE_TYPES.includes(messageType)) {
    throw new ApiError(400, 'סוג הודעה לא תקין');
  }

  return Message.create({
    sender: senderId,
    recipient,
    text: text.trim(),
    type: messageType,
  });
}

/**
 * היסטוריית השיחה בין שני המשתמשים, בשני הכיוונים, מהישנה לחדשה.
 * מוגש ע"י האינדקס { sender, recipient, createdAt }; `lean()` כי זו קריאה בלבד
 * לתצוגה ועלולה להחזיר היסטוריה ארוכה.
 */
async function history(userId, chatWithUserId) {
  return Message.find({
    $or: [
      { sender: userId, recipient: chatWithUserId },
      { sender: chatWithUserId, recipient: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();
}

module.exports = { send, history };
