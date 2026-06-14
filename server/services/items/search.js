'use strict';

const { Item, Booking } = require('../../../database/models');
const { ApiError } = require('../../utils/errors');
const { geocodeAddress } = require('../../utils/geocode');
const { clampPaging, paginated } = require('../../utils/pagination');

const OWNER_PUBLIC = 'firstName lastName avatarUrl';
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

  const { pg, lim } = clampPaging({ page, limit, defLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT });

  const coords = parseCoords(lat, lng);
  if (coords) {
    return listNearby({ filter, coords, radius, pg, lim, sort });
  }

  const [items, total] = await Promise.all([
    Item.find(filter).populate('owner', OWNER_PUBLIC).sort(sortStage(sort)).skip((pg - 1) * lim).limit(lim),
    Item.countDocuments(filter),
  ]);

  return paginated(items, total, pg, lim);
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
  return [longitude, latitude];
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
  return paginated(items, total, pg, lim);
}

async function getById(id) {
  const item = await Item.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('owner', `${OWNER_PUBLIC} email phone`);
  if (!item) throw new ApiError(404, 'Item not found');
  return item;
}

module.exports = { list, geocode, getById };
