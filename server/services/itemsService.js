'use strict';

const { Item, Booking, User } = require('../../database/models');
const { ApiError } = require('../utils/errors');
const { toPoint } = require('../utils/geo');
const { geocodeAddress } = require('../utils/geocode');
const categoriesService = require('./categoriesService');

const OWNER_PUBLIC = 'firstName lastName avatarUrl';
const EDITABLE = ['title', 'description', 'category', 'dailyRate', 'imageUrl', 'isActive'];

// Default and ceiling for the "near me" search radius, in kilometres.
const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;

// Pagination defaults. The catalog loads in small batches ("Load More") rather
// than one big over-fetch, so the default page size is intentionally small.
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 200;

/** Public catalog browse with optional category / keyword / date-availability / geo filters. */
async function list({ q, category, owner, availableFrom, availableTo, lat, lng, radius, sort, page = 1, limit = DEFAULT_LIMIT } = {}) {
  // `$ne: true` (not `false`) so legacy items created before the field existed —
  // which simply have no `isDeleted` — are still included.
  const filter = { isActive: true, isDeleted: { $ne: true } };

  // Category: accept a single value or a comma-separated list (multi-select
  // sidebar) → `$in`.
  if (category) {
    const cats = String(category).split(',').map((c) => c.trim()).filter(Boolean);
    if (cats.length === 1) filter.category = cats[0];
    else if (cats.length > 1) filter.category = { $in: cats };
  }
  if (owner) filter.owner = owner;

  // Keyword: case-insensitive substring over title + description. Applied to the
  // filter object so it works for BOTH the normal find and the $geoNear `query`
  // stage — unlike `$text`, which can't be combined with $geoNear.
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  // date availability: exclude items with an active booking overlapping the range
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

  // Geo "near me" search: when valid coordinates are supplied, $geoNear filters
  // by radius and sorts closest→farthest for us, exposing only a rounded distance.
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

/** Escape user input before using it inside a RegExp. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Translate the `sort` query param into a Mongo sort spec for the find() path. */
function sortStage(sort) {
  switch (sort) {
    case 'price-asc':  return { dailyRate: 1 };
    case 'price-desc': return { dailyRate: -1 };
    case 'recommended':
      // "Recommended": surface the best items to the top without hiding any.
      //   1) averageRating  desc — highest-rated first
      //   2) totalReviews   desc — tie-break by how many people rated it
      //   3) createdAt      desc — unreviewed items (rating/reviews = 0) fall
      //                            back to newest-first, so nothing is hidden.
      return { averageRating: -1, totalReviews: -1, createdAt: -1 };
    case 'newest':
    default:
      // Absolute default: newest items (most recently created) first, backed by
      // the schema's `timestamps: true` createdAt. The frontend leaves `sort`
      // unset for this default, so the plain no-param browse lands here too.
      return { createdAt: -1 };
  }
}

/** Shape the paginated result into the API's `{ items, pagination }` contract. */
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

/**
 * Resolve a free-text search address (e.g. "Tel Aviv") to a search centre.
 * Used by the catalog's address search box so the frontend can convert a typed
 * place into coordinates, then run the normal radius search at GET /api/items.
 * Returns the centre as `{ lat, lng }` — full precision, since it's a search
 * origin, not a stored owner location (so no fuzzing needed here).
 */
async function geocode(address) {
  const q = String(address || '').trim();
  if (!q) throw new ApiError(400, 'Search address is required');

  const coords = await geocodeAddress(q);
  if (!coords) throw new ApiError(404, 'Could not find that address');

  const [lng, lat] = coords;
  return { lat, lng };
}

/** Parse `lat`/`lng` query params into a validated [lng, lat] pair, or null. */
function parseCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (lat == null || lng == null || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [longitude, latitude]; // GeoJSON order
}

/**
 * Radius search via $geoNear. Returns the same item shape as the normal browse
 * (`id`, populated `owner`) plus a rounded `distanceInMeters`, and — critically —
 * never includes the raw `location` coordinates, so the catalog can't be scraped
 * for owners' addresses.
 */
async function listNearby({ filter, coords, radius, pg, lim, sort }) {
  const radiusKm = Math.min(Math.max(Number(radius) || DEFAULT_RADIUS_KM, 0.1), MAX_RADIUS_KM);

  // Mirror the non-geo sort options. The absolute default here is also newest
  // first. For "Recommended" the final tie-breaker is proximity (closest first)
  // rather than newest — in a "near me" search distance is the more useful
  // fallback. `distanceInMeters` is provided by the $geoNear stage.
  const geoSort = sort === 'price-asc' ? [{ $sort: { dailyRate: 1 } }]
    : sort === 'price-desc' ? [{ $sort: { dailyRate: -1 } }]
      : sort === 'recommended' ? [{ $sort: { averageRating: -1, totalReviews: -1, distanceInMeters: 1 } }]
        : [{ $sort: { createdAt: -1 } }]; // newest first — the default, here too

  const [result] = await Item.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: coords },
        distanceField: 'distanceInMeters', // metres, provided by MongoDB
        maxDistance: radiusKm * 1000, // km → metres
        spherical: true,
        query: filter, // apply the non-geo filters (active/category/keyword/availability…)
      },
    },
    {
      // one pass: paginated items + total matched count
      $facet: {
        items: [
          ...geoSort,
          { $skip: (pg - 1) * lim },
          { $limit: lim },
          { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'ownerDoc' } },
          { $unwind: { path: '$ownerDoc', preserveNullAndEmptyArrays: true } },
          {
            // PRIVACY: `location` is deliberately excluded — only the rounded
            // distance leaves the server. Shape matches the populated find path.
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

/** Items belonging to a specific owner (their own listings) — excludes deleted. */
async function listByOwner(ownerId) {
  return Item.find({ owner: ownerId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
}

// Statuses that make a date range genuinely unavailable. This MUST match the
// overlap check in bookingsService.create (ACTIVE_STATUSES): a PENDING booking
// already reserves its dates — the server rejects a clashing booking with 409 —
// so those days have to show as taken on the calendar too, otherwise renters see
// "free" days they can't actually book. An in-progress rental stays 'APPROVED'
// until COMPLETED, so PENDING + APPROVED together are the blocking set.
const BLOCKING_STATUSES = ['PENDING', 'APPROVED'];

/**
 * Confirmed booking windows for an item, as plain { startDate, endDate } ranges.
 * Used by the frontend calendar to disable already-booked days. Returns `[]` for
 * an unknown item id rather than throwing — the calendar just shows all days free.
 */
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

/**
 * Decide an item's pickup location, in priority order, returning a privacy-fuzzed
 * GeoJSON Point (3 decimals, ~100 m) or null when none can be resolved:
 *
 *   1. Explicit coordinates supplied with the item payload.
 *   2. A free-text `address` → geocoded via Nominatim (best-effort; null on miss).
 *   3. Inherited from the owner's profile `defaultLocation`.
 *
 * `toPoint` does the fuzzing, so whichever source wins, the stored coordinate is
 * already coarsened before it reaches the document.
 */
async function resolveItemLocation({ ownerId, location, address }) {
  // 1) explicit coordinates win
  const explicit = toPoint(location);
  if (explicit) return explicit;

  // 2) geocode a typed address
  if (address && String(address).trim()) {
    const coords = await geocodeAddress(address);
    if (coords) return toPoint({ coordinates: coords });
  }

  // 3) inherit the owner's saved default location
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

  // Pickup location: a free-text `address` is geocoded (same as the create flow)
  // and takes priority; otherwise explicit `location` coordinates are accepted.
  // Either way the value is normalised via toPoint so we never persist a
  // malformed Point. A non-empty address that can't be geocoded is a 400.
  if (data.address !== undefined && String(data.address).trim()) {
    const coords = await geocodeAddress(String(data.address).trim());
    if (!coords) throw new ApiError(400, 'Could not find that address');
    item.location = toPoint({ coordinates: coords });
  } else if (data.location !== undefined) {
    item.location = toPoint(data.location) || undefined;
  }

  // validateModifiedOnly: editing unrelated fields on a legacy item with a
  // malformed stored location shouldn't fail; a newly set location is still
  // validated because it's a modified path.
  await item.save({ validateModifiedOnly: true });
  return item;
}

// Bookings in any of these states represent an open obligation and block
// deletion. Our enum has no 'ACTIVE' today (an in-progress rental stays
// 'APPROVED' until COMPLETED) — it's included so the guard stays correct if such
// a state is ever introduced.
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'ACTIVE'];

/**
 * Soft-delete an item. Preserves the row (and its historical bookings/reviews)
 * by flagging `isDeleted: true` rather than removing it. Refuses while the item
 * still has pending/approved/active bookings, so a renter's confirmed loan can't
 * vanish from under them.
 */
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
  // validateModifiedOnly: only re-validate the changed field, so a legacy item
  // with a malformed `location` Point doesn't block its own soft-deletion.
  await item.save({ validateModifiedOnly: true });
}

function ensureOwnerOrAdmin(item, user) {
  if (String(item.owner) !== String(user.id) && user.role !== 'ADMIN') {
    throw new ApiError(403, 'You are not allowed to modify this item');
  }
}

module.exports = { list, geocode, getById, listByOwner, bookedDates, create, update, remove };
