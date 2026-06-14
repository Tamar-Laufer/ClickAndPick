'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const COLORS = ['coral', 'teal', 'green', 'blue', 'butter'];
const categorySchema = new Schema(
  {
    value: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [1, 'Category name is too short'],
      maxlength: [60, 'Category name is too long'],
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
