'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema, model } = mongoose;

const ROLES = ['USER', 'ADMIN'];
const SALT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * User — regular users and platform administrators.
 * Security:
 *  - `passwordHash` is `select: false`, so it is never returned by default.
 *    To verify a login, query with `.select('+passwordHash')` then call
 *    `user.comparePassword(plain)`.
 *  - `toJSON` strips the hash and internal fields so it can't leak in responses.
 */
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
      select: false, // never sent to the client unless explicitly selected
    },
    // ── Password reset (forgot-password flow) ──
    // We store ONLY a SHA-256 hash of the reset token, never the raw value, so a
    // leaked DB dump can't be used to reset accounts. Both are `select: false`
    // so they are never loaded/serialised unless a query explicitly asks. The
    // expiry is checked server-side on redemption.
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
    // Public URL of the user's profile photo (uploaded via /uploads/image).
    // Optional — the UI falls back to the name initial when empty.
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // Human-readable address the user typed (optional). Used to geocode a
    // defaultLocation and shown back to the user on their own profile.
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address is too long'],
      default: '',
    },
    /**
     * The user's default pickup location as a GeoJSON Point, inherited by any
     * item they list without its own coordinates. Optional — same shape and
     * caveats as Item.location: no inner `type` default (an empty Point can't be
     * indexed/saved), `coordinates` is [longitude, latitude], validated only
     * when present. This is the user's *exact* location; items copy a fuzzed
     * (3-decimal, ~100 m) version of it, never the precise value.
     */
    defaultLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          // Treat an absent/empty array as "no location" so it never blocks a
          // save (e.g. updating the avatar on a user that has an empty
          // defaultLocation). Only an actually-populated array is range-checked.
          validator: (v) =>
            v == null ||
            v.length === 0 ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 && // longitude
              v[1] >= -90 && v[1] <= 90), // latitude
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
    // reputation as a renter (owners rate the renter's behaviour)
    averageRenterRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRenterReviews: { type: Number, default: 0, min: 0 },

    // ── Trust Score (0–100) ──
    // Composite reputation surfaced across the platform. New users start at a
    // neutral 50 and keep it until their first PUBLIC review triggers a
    // recalculation (see calculateTrustScore). Persisted so it can be read
    // without re-aggregating on every request.
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    // lifetime count of bookings that reached COMPLETED (feeds the Volume term)
    completedTransactions: { type: Number, default: 0, min: 0 },
    // bookings this user CANCELLED after they were APPROVED (feeds Reliability)
    cancelledTransactions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/* Strip sensitive / internal fields from any serialised output */
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret._id;
    return ret;
  },
});

/* ── instance & static helpers ── */

// Hash a plaintext password and assign it to this document (call before save).
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

// Constant-time compare of a candidate password against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

// Convenience: hash a password without an instance (e.g. on create).
userSchema.statics.hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

/**
 * Recompute this user's Trust Score (0–100) from their current reputation
 * fields and persist it. Intended to be called whenever one of those inputs
 * changes — i.e. when a renter review of this user becomes public, or when a
 * completed/cancelled transaction counter is bumped.
 *
 * Weighted breakdown:
 *   • Quality     (70 pts) — normalised average renter rating: (avg / 5) * 70.
 *   • Volume      (20 pts) — 2 pts per completed transaction, capped at 20.
 *   • Reliability (10 pts) — starts at 10, minus 2 for each post-approval cancel.
 *
 * Note: this is only ever triggered once a public review exists, so a brand-new
 * user keeps the default 50 (rather than collapsing to 10 with an empty Quality
 * term). Resolves to the saved score.
 */
userSchema.methods.calculateTrustScore = async function calculateTrustScore() {
  const avgRating = Number(this.averageRenterRating) || 0; // 0–5
  const completed = Number(this.completedTransactions) || 0;
  const cancelled = Number(this.cancelledTransactions) || 0;

  const quality = (avgRating / 5) * 70; // 0–70
  const volume = Math.min(completed * 2, 20); // 0–20
  const reliability = Math.max(0, 10 - cancelled * 2); // 0–10

  const raw = quality + volume + reliability;
  this.trustScore = Math.max(0, Math.min(100, Math.round(raw))); // clamp + integer

  await this.save();
  return this.trustScore;
};

userSchema.statics.ROLES = ROLES;

module.exports = model('User', userSchema);
