'use strict';

const { User, Item, Booking, Category } = require('../../database/models');

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
