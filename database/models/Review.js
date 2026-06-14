'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const TARGET_MODELS = ['User', 'Item'];

const reviewSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetModel: { type: String, required: true, enum: TARGET_MODELS },
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    rating: { type: Number, required: true, min: [1, 'Rating must be 1–5'], max: [5, 'Rating must be 1–5'] },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ targetModel: 1, targetId: 1, isPublic: 1 });

reviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) { delete ret._id; return ret; },
});


reviewSchema.statics.recalculate = async function recalculate(targetModel, targetId) {
  const oid = new mongoose.Types.ObjectId(targetId);

  const [result] = await this.aggregate([
    { $match: { targetModel, targetId: oid, isPublic: true } },
    { $group: { _id: '$targetId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const average = result ? Math.round(result.avg * 10) / 10 : 0; 
  const count = result ? result.count : 0;

  if (targetModel === 'Item') {
    await mongoose.model('Item').findByIdAndUpdate(targetId, { averageRating: average, totalReviews: count });
  } else {
    await mongoose.model('User').findByIdAndUpdate(targetId, { averageRenterRating: average, totalRenterReviews: count });
  }

  return { average, count };
};

reviewSchema.statics.TARGET_MODELS = TARGET_MODELS;

module.exports = model('Review', reviewSchema);
