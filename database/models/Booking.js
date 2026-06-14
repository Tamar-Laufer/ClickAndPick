'use strict';

const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const BOOKING_STATUS = ['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'];

const PLATFORM_FEE_RATE = 0.1; 

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
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
      min: [0, 'Platform fee cannot be negative'],
      default: 0,
    },
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
    completedAt: { type: Date },
    returnReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

bookingSchema.pre('validate', function validateDates() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
});

bookingSchema.index({ item: 1, status: 1 }); 
bookingSchema.index({ renter: 1, createdAt: -1 }); 

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
