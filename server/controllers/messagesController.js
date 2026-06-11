'use strict';

const asyncHandler = require('../utils/asyncHandler');
const messagesService = require('../services/messagesService');

// POST /api/messages — שמירת הודעה חדשה. השולח נלקח מהטוקן (req.user.id).
exports.send = asyncHandler(async (req, res) => {
  const message = await messagesService.send({
    senderId: req.user.id,
    recipient: req.body.recipient,
    text: req.body.text,
    type: req.body.type,
  });
  res.status(201).json({ message });
});

// GET /api/messages/:chatWithUserId — היסטוריית השיחה בין המשתמש המחובר לנמען.
exports.history = asyncHandler(async (req, res) => {
  const messages = await messagesService.history(req.user.id, req.params.chatWithUserId);
  res.json({ messages });
});
