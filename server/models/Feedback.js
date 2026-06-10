'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const FEEDBACK_TYPES = ['question', 'recommendation'];

/**
 * Feedback — a public contact-inbox entry. ANYONE (no login) can submit a
 * `question` (a comment / inquiry for the admin) or a `recommendation`
 * (social proof) via the footer form, giving just a name + email. The admin
 * reads everything in the inbox; only recommendations can be flipped to
 * `isApprovedForHomepage` to appear in the public homepage carousel.
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
    // only meaningful for `recommendation`; admin curates which show publicly
    isApprovedForHomepage: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  // createdAt (+ updatedAt) provided by timestamps — used for "newest first"
  { timestamps: true },
);

// fast path for the public "approved recommendations, newest first" query
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
