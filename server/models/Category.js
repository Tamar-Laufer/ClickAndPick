'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

/**
 * Category — the admin-managed item taxonomy (edited from the dashboard
 * instead of a hard-coded enum).
 *
 *   value  stable identifier stored on every Item (e.g. 'TOOLS', or a Hebrew
 *          label for admin-added ones). Unique — the 11000 duplicate-key error
 *          is mapped to a clean 409 by the global error handler.
 *   label  Hebrew display text shown in forms, filters and item cards.
 *   color  chip colour token (coral / teal / green / blue / butter …).
 *   icon   optional icon identifier the UI may resolve.
 *
 * Items reference a category by its `value`. The four original categories
 * (TOOLS / CAMPING / EVENTS / CLEANING) are seeded so existing items keep
 * resolving; see server/seeds/categories.js.
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
