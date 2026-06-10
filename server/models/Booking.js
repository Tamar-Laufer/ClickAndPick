'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const BOOKING_STATUS = ['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'];

// The platform keeps this fraction of every booking's totalPrice as commission.
// Centralised here so the booking calc and the admin revenue aggregation agree.
const PLATFORM_FEE_RATE = 0.1; // 10%

/**
 * Booking — a rental transaction: a renter books an item for a date range.
 */
const bookingSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item is required'],
      index: true,
    },
    renter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Renter is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },
    // Commission the platform keeps (totalPrice * PLATFORM_FEE_RATE).
    // Computed server-side at booking creation — never trusted from the client.
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
      min: [0, 'Platform fee cannot be negative'],
      default: 0,
    },
    // What the item owner is paid out (totalPrice - platformFee).
    ownerEarnings: {
      type: Number,
      required: [true, 'Owner earnings are required'],
      min: [0, 'Owner earnings cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: { values: BOOKING_STATUS, message: '{VALUE} is not a valid status' },
      default: 'PENDING',
      index: true,
    },
    // set when status becomes COMPLETED — starts the 7-day review window
    completedAt: { type: Date },
    // set when the pre-return reminder email is sent — ensures each rental is
    // reminded exactly once (the cron re-runs hourly and skips reminded ones).
    returnReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* The booking window must be valid (end strictly after start) */
bookingSchema.pre('validate', function validateDates() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
});

/* Indexes for the common access patterns */
bookingSchema.index({ item: 1, status: 1 }); // availability / overlap checks per item
bookingSchema.index({ renter: 1, createdAt: -1 }); // a user's booking history

bookingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    return ret;
  },
});

const Booking = model('Booking', bookingSchema);
Booking.STATUS = BOOKING_STATUS;
Booking.PLATFORM_FEE_RATE = PLATFORM_FEE_RATE;

module.exports = Booking;
