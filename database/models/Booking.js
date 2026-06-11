'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const BOOKING_STATUS = ['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'];

// הפלטפורמה שומרת חלק זה מ-totalPrice של כל הזמנה כעמלה. מרוכז כאן כדי שחישוב
// ההזמנה ואגרגציית ההכנסות של האדמין יהיו עקביים.
const PLATFORM_FEE_RATE = 0.1; // 10%

/**
 * Booking — עסקת השכרה: שוכר מזמין פריט לטווח תאריכים.
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
    // העמלה שהפלטפורמה שומרת (totalPrice * PLATFORM_FEE_RATE).
    // מחושב בצד השרת ביצירת ההזמנה — לעולם לא נסמך על הלקוח.
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
      min: [0, 'Platform fee cannot be negative'],
      default: 0,
    },
    // הסכום המשולם לבעלים (totalPrice - platformFee).
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
    // נקבע כשהסטטוס הופך ל-COMPLETED — מתחיל את חלון הביקורות בן 7 הימים
    completedAt: { type: Date },
    // נקבע כשנשלח מייל תזכורת לפני ההחזרה — מבטיח שכל השכרה תקבל תזכורת בדיוק
    // פעם אחת (ה-cron רץ שוב כל שעה ומדלג על אלו שכבר קיבלו).
    returnReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* חלון ההזמנה חייב להיות תקין (תאריך הסיום ממש אחרי תאריך ההתחלה) */
bookingSchema.pre('validate', function validateDates() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
});

/* אינדקסים לדפוסי הגישה הנפוצים */
bookingSchema.index({ item: 1, status: 1 }); // בדיקות זמינות / חפיפה לכל פריט
bookingSchema.index({ renter: 1, createdAt: -1 }); // היסטוריית ההזמנות של משתמש

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
