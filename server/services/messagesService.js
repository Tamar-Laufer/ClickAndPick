'use strict';

const { Message } = require('../../database/models');
const { ApiError } = require('../utils/errors');

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
