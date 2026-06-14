'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const MESSAGE_TYPES = ['text', 'audio'];

const messageSchema = new Schema({
  sender:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true, maxlength: 4000 },
  type:      { type: String, enum: MESSAGE_TYPES, default: 'text' },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

messageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) { delete ret._id; return ret; },
});

messageSchema.statics.MESSAGE_TYPES = MESSAGE_TYPES;

module.exports = model('Message', messageSchema);
