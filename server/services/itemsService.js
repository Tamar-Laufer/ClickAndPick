'use strict';

const { Item, Booking, User } = require('../../database/models');
const { ApiError } = require('../utils/errors');
const { toPoint } = require('../utils/geo');
const { geocodeAddress } = require('../utils/geocode');
const categoriesService = require('./categoriesService');

const OWNER_PUBLIC = 'firstName lastName avatarUrl';
const EDITABLE = ['title', 'description', 'category', 'dailyRate', 'imageUrl', 'isActive'];
const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 200;

async function list({ q, category, owner, availableFrom, availableTo, lat, lng, radius, sort, page = 1, limit = DEFAULT_LIMIT } = {}) {
  const filter = { isActive: true, isDeleted: { $ne: true } };

  if (category) {
    const cats = String(category).split(',').map((c) => c.trim()).filter(Boolean);
    if (cats.length === 1) filter.category = cats[0];
    else if (cats.length > 1) filter.category = { $in: cats };
  }
  if (owner) filter.owner = owner;

  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  if (availableFrom && availableTo) {
    const from = new Date(availableFrom);
    const to = new Date(availableTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to > from) {
      const busy = await Booking.find({
        status: { $in: ['PENDING', 'APPROVED'] },
        startDate: { $lt: to },
        endDate: { $gt: from },
      }).distinct('item');
      filter._id = { $nin: busy };
    }
  }

  const lim = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const pg = Math.max(Number(page) || 1, 1);

  const coords = parseCoords(lat, lng);
  if (coords) {
    return listNearby({ filter, coords, radius, pg, lim, sort });
  }

  const [items, total] = await Promise.all([
    Item.find(filter).populate('owner', OWNER_PUBLIC).sort(sortStage(sort)).skip((pg - 1) * lim).limit(lim),
    Item.countDocuments(filter),
  ]);

  return buildResult(items, total, pg, lim);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sortStage(sort) {
  switch (sort) {
    case 'price-asc':  return { dailyRate: 1 };
    case 'price-desc': return { dailyRate: -1 };
    case 'recommended':
      return { averageRating: -1, totalReviews: -1, createdAt: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

function buildResult(items, total, pg, lim) {
  const totalPages = Math.max(Math.ceil(total / lim), 1);
  return {
    items,
    pagination: {
      currentPage: pg,
      totalPages,
      totalItems: total,
      hasMore: pg < totalPages,
    },
  };
}

async function geocode(address) {
  const q = String(address || '').trim();
  if (!q) throw new ApiError(400, 'Search address is required');

  const coords = await geocodeAddress(q);
  if (!coords) throw new ApiError(404, 'Could not find that address');

  const [lng, lat] = coords;
  return { lat, lng };
}

function parseCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (lat == null || lng == null || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [longitude, latitude]; // GeoJSON order
}

async function listNearby({ filter, coords, radius, pg, lim, sort }) {
  const radiusKm = Math.min(Math.max(Number(radius) || DEFAULT_RADIUS_KM, 0.1), MAX_RADIUS_KM);

  const geoSort = sort === 'price-asc' ? [{ $sort: { dailyRate: 1 } }]
    : sort === 'price-desc' ? [{ $sort: { dailyRate: -1 } }]
      : sort === 'recommended' ? [{ $sort: { averageRating: -1, totalReviews: -1, distanceInMeters: 1 } }]
        : [{ $sort: { createdAt: -1 } }]; 
  const [result] = await Item.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: coords },
        distanceField: 'distanceInMeters', 
        maxDistance: radiusKm * 1000, 
        spherical: true,
        query: filter, 
      },
    },
    {
      $facet: {
        items: [
          ...geoSort,
          { $skip: (pg - 1) * lim },
          { $limit: lim },
          { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'ownerDoc' } },
          { $unwind: { path: '$ownerDoc', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              title: 1,
              description: 1,
              category: 1,
              dailyRate: 1,
              imageUrl: 1,
              isActive: 1,
              averageRating: 1,
              totalReviews: 1,
              createdAt: 1,
              updatedAt: 1,
              distanceInMeters: { $round: ['$distanceInMeters', 0] },
              owner: {
                id: { $toString: '$ownerDoc._id' },
                firstName: '$ownerDoc.firstName',
                lastName: '$ownerDoc.lastName',
                avatarUrl: '$ownerDoc.avatarUrl',
              },
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const items = result?.items ?? [];
  const total = result?.total?.[0]?.count ?? 0;
  return buildResult(items, total, pg, lim);
}

async function getById(id) {
  // A soft-deleted item reads as "not found" for the public item page.
  const item = await Item.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('owner', `${OWNER_PUBLIC} email phone`);
  if (!item) throw new ApiError(404, 'Item not found');
  return item;
}

// "My items" tab in the profile. Loads one page at a time (default 6) and
// attaches each item's live lending status — derived from ONLY this page's
// bookings (scoped $in), so the cost scales with the page size, not the whole
// rental history. Moving the derivation server-side keeps the badge correct
// even though the profile no longer holds the full incoming-requests list.
const OWNER_PAGE_SIZE = 6;
const OWNER_MAX_PAGE_SIZE = 50;

async function listByOwner(ownerId, { page = 1, limit = OWNER_PAGE_SIZE } = {}) {
  const lim = Math.min(Math.max(Number(limit) || OWNER_PAGE_SIZE, 1), OWNER_MAX_PAGE_SIZE);
  const pg = Math.max(Number(page) || 1, 1);

  const filter = { owner: ownerId, isDeleted: { $ne: true } };
  const [items, total] = await Promise.all([
    Item.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
    Item.countDocuments(filter),
  ]);

  const statusByItem = await deriveItemStatuses(items.map((i) => i._id));
  const totalPages = Math.max(Math.ceil(total / lim), 1);
  return {
    items: items.map((i) => ({ ...i.toJSON(), status: statusByItem.get(String(i._id)) || availabilityStatus(i) })),
    pagination: { currentPage: pg, totalPages, totalItems: total, hasMore: pg < totalPages },
  };
}

/** Status badge for an item with no active bookings — hidden vs. available. */
function availabilityStatus(item) {
  return item.isActive === false
    ? { cls: 'cancelled', label: 'מוסתר' }
    : { cls: 'available', label: 'זמין' };
}

/**
 * For the given item ids, group their PENDING/APPROVED bookings and reduce each
 * to a single status badge — same precedence the profile used to compute on the
 * client: lent-now > pending requests > approved-upcoming > available/hidden.
 */
async function deriveItemStatuses(itemIds) {
  const map = new Map();
  if (!itemIds.length) return map;

  const now = new Date();
  const bookings = await Booking.find({
    item: { $in: itemIds },
    status: { $in: BLOCKING_STATUSES },
  }).select('item status startDate endDate').lean();

  const byItem = new Map();
  bookings.forEach((b) => {
    const key = String(b.item);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(b);
  });

  byItem.forEach((bks, key) => {
    if (bks.some((b) => b.status === 'APPROVED' && b.startDate <= now && now <= b.endDate)) {
      map.set(key, { cls: 'active', label: 'מושאל כעת' });
      return;
    }
    const pending = bks.filter((b) => b.status === 'PENDING').length;
    if (pending) {
      map.set(key, { cls: 'pending', label: `${pending} בקשות ממתינות` });
      return;
    }
    if (bks.some((b) => b.status === 'APPROVED' && b.startDate > now)) {
      map.set(key, { cls: 'approved', label: 'מאושר להשאלה' });
    }
  });

  return map;
}

const BLOCKING_STATUSES = ['PENDING', 'APPROVED'];


async function bookedDates(itemId) {
  const bookings = await Booking.find(
    { item: itemId, status: { $in: BLOCKING_STATUSES } },
    'startDate endDate', // project only what the calendar needs
  )
    .sort({ startDate: 1 })
    .lean();

  return bookings.map(({ startDate, endDate }) => ({ startDate, endDate }));
}

async function create(ownerId, { title, description, category, dailyRate, imageUrl, location, address }) {
  await categoriesService.assertExists(category); // reject unknown categories up front
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

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'ACTIVE'];

async function remove(id, user) {
  const item = await Item.findById(id);
  if (!item) throw new ApiError(404, 'Item not found');
  if (item.isDeleted) throw new ApiError(404, 'Item not found'); // already gone
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

module.exports = { list, geocode, getById, listByOwner, bookedDates, create, update, remove };
