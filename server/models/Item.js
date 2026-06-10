'use strict';

const mongoose = require('mongoose');

const { Schema, model } = mongoose;

/**
 * Item — a physical item an owner makes available for short-term rent.
 * `imageUrl` holds a cloud-hosted URL (e.g. S3 / Cloudinary), never raw bytes.
 */
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
    // category is an admin-managed Category.value (see models/Category.js).
    // Existence is validated in itemsService against the Category collection
    // on create/update — not a static enum here, so admins can add categories.
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
    /**
     * Pickup location as a GeoJSON Point, used for "near me" search.
     * `coordinates` is [longitude, latitude] (GeoJSON order — NOT lat,lng).
     *
     * The field is optional: not every item is geocoded, and a 2dsphere index
     * simply skips documents that lack it. When a location *is* present we
     * validate it has exactly two numbers in valid lng/lat ranges, so we never
     * index a malformed Point.
     *
     * PRIVACY: these raw coordinates are an owner's home/pickup spot and must
     * never be returned by the public catalog — see itemsService, which exposes
     * only a rounded distance, never `location`.
     */
    location: {
      // No `default: 'Point'` here on purpose: a default would materialise an
      // empty `location: { type: 'Point' }` (no coordinates) on every item, and
      // a 2dsphere index rejects a Point with no coordinates at insert time.
      // `type` is set explicitly only when coordinates are supplied (see service).
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
            v[0] >= -180 && v[0] <= 180 && // longitude
            v[1] >= -90 && v[1] <= 90, // latitude
          message: 'coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Soft-delete flag. We never hard-delete an item, so its historical bookings
    // and reviews keep referencing a real row. Deleted items are filtered out of
    // every public/owner listing query; the record is retained for data integrity.
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // aggregated rating (renters rate the item)
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/* Indexes for the common access patterns */
itemSchema.index({ category: 1, isActive: 1 }); // browse a category's live items
itemSchema.index({ title: 'text', description: 'text' }); // keyword search
itemSchema.index({ location: '2dsphere' }); // "near me" geo search (sorts closest→farthest)
itemSchema.index({ averageRating: -1, totalReviews: -1 }); // "Recommended" quality sort (see itemsService.sortStage)

itemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    // PRIVACY: raw pickup coordinates must never leave the server. The "near me"
    // search exposes only a rounded distance (see itemsService.listNearby).
    delete ret.location;
    return ret;
  },
});

module.exports = model('Item', itemSchema);
