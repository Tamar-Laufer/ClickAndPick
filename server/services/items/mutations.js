'use strict';

const { Item, Booking, User } = require('../../../database/models');
const { ApiError } = require('../../utils/errors');
const { toPoint } = require('../../utils/geo');
const { geocodeAddress } = require('../../utils/geocode');
const categoriesService = require('../categoriesService');

const EDITABLE = ['title', 'description', 'category', 'dailyRate', 'imageUrl', 'isActive'];
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'ACTIVE'];

async function create(ownerId, { title, description, category, dailyRate, imageUrl, location, address }) {
  await categoriesService.assertExists(category);
  const doc = { owner: ownerId, title, description, category, dailyRate, imageUrl };
  const point = await resolveItemLocation({ ownerId, location, address });
  if (point) doc.location = point;
  return Item.create(doc);
}

async function resolveItemLocation({ ownerId, location, address }) {
  const explicit = toPoint(location);
  if (explicit) return explicit;

  if (address && String(address).trim()) {
    const coords = await geocodeAddress(address);
    if (coords) return toPoint({ coordinates: coords });
  }

  const owner = await User.findById(ownerId).select('defaultLocation');
  if (owner?.defaultLocation?.coordinates?.length === 2) {
    return toPoint({ coordinates: owner.defaultLocation.coordinates });
  }

  return null;
}

async function update(id, user, data) {
  const item = await Item.findById(id);
  if (!item) throw new ApiError(404, 'Item not found');
  ensureOwnerOrAdmin(item, user);

  if (data.category !== undefined) await categoriesService.assertExists(data.category);

  for (const field of EDITABLE) {
    if (data[field] !== undefined) item[field] = data[field];
  }

  if (data.address !== undefined && String(data.address).trim()) {
    const coords = await geocodeAddress(String(data.address).trim());
    if (!coords) throw new ApiError(400, 'Could not find that address');
    item.location = toPoint({ coordinates: coords });
  } else if (data.location !== undefined) {
    item.location = toPoint(data.location) || undefined;
  }

  await item.save({ validateModifiedOnly: true });
  return item;
}

async function remove(id, user) {
  const item = await Item.findById(id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.isDeleted) throw new ApiError(404, 'Item not found');
  ensureOwnerOrAdmin(item, user);

  const activeBookings = await Booking.countDocuments({
    item: item._id,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
  if (activeBookings > 0) {
    throw new ApiError(
      400,
      'Cannot delete an item with active, approved, or pending bookings. Please resolve your bookings first.',
    );
  }

  item.isDeleted = true;
  await item.save({ validateModifiedOnly: true });
}

function ensureOwnerOrAdmin(item, user) {
  if (String(item.owner) !== String(user.id) && user.role !== 'ADMIN') {
    throw new ApiError(403, 'You are not allowed to modify this item');
  }
}

module.exports = { create, update, remove };
