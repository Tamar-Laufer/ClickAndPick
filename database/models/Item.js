'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const itemSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title is too short'],
      maxlength: [120, 'Title is too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description is too long'],
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    dailyRate: {
      type: Number,
      required: [true, 'Daily rate is required'],
      min: [0, 'Daily rate cannot be negative'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: (v) =>
            Array.isArray(v) &&
            v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 && // קו אורך (longitude)
            v[1] >= -90 && v[1] <= 90, // קו רוחב (latitude)
          message: 'coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

itemSchema.index({ category: 1, isActive: 1 }); 
itemSchema.index({ title: 'text', description: 'text' }); 
itemSchema.index({ location: '2dsphere' }); 
itemSchema.index({ averageRating: -1, totalReviews: -1 }); 

itemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    delete ret.location;
    return ret;
  },
});

module.exports = model('Item', itemSchema);
