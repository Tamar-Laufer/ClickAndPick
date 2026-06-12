'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema, model } = mongoose;

const ROLES = ['USER', 'ADMIN'];
const SALT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [60, 'First name is too long'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [60, 'Last name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_RE, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, 
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-()\s]{7,20}$/, 'Please provide a valid phone number'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },

    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address is too long'],
      default: '',
    },

    defaultLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], 
        validate: {
          validator: (v) =>
            v == null ||
            v.length === 0 ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 && 
              v[1] >= -90 && v[1] <= 90), 
          message: 'coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    role: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a supported role' },
      default: 'USER',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    averageRenterRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRenterReviews: { type: Number, default: 0, min: 0 },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    completedTransactions: { type: Number, default: 0, min: 0 },
    cancelledTransactions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret._id;
    return ret;
  },
});


userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);


userSchema.methods.calculateTrustScore = async function calculateTrustScore() {
  const avgRating = Number(this.averageRenterRating) || 0; 
  const completed = Number(this.completedTransactions) || 0;
  const cancelled = Number(this.cancelledTransactions) || 0;

  const quality = (avgRating / 5) * 70; 
  const volume = Math.min(completed * 2, 20); 
  const reliability = Math.max(0, 10 - cancelled * 2); 

  const raw = quality + volume + reliability;
  this.trustScore = Math.max(0, Math.min(100, Math.round(raw))); 

  await this.save();
  return this.trustScore;
};

userSchema.statics.ROLES = ROLES;

module.exports = model('User', userSchema);
