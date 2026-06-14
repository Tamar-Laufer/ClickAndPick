'use strict';

const asyncHandler = require('../utils/asyncHandler');
const messagesService = require('../services/messagesService');

exports.send = asyncHandler(async (req, res) => {
  const message = await messagesService.send({
    senderId: req.user.id,
    recipient: req.body.recipient,
    text: req.body.text,
    type: req.body.type,
  });
  res.status(201).json({ message });
});

exports.history = asyncHandler(async (req, res) => {
  const messages = await messagesService.history(req.user.id, req.params.chatWithUserId);
  res.json({ messages });
});
