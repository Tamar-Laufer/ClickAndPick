'use strict';

const { User, Item, Booking, Category } = require('../../database/models');

/**
 * PUBLIC aggregate counts for the homepage stats band. Aggregate numbers only —
 * no personal data is exposed. `items` counts only LIVE items (active &
 * non-deleted), matching what the public catalogue actually shows.
 */
async function publicCounts() {
  const [users, items, categories, bookings] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
    Category.countDocuments(),
    Booking.countDocuments(),
  ]);
  return { users, items, categories, bookings };
}

module.exports = { publicCounts };
