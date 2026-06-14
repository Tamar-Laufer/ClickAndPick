'use strict';

const { Item, Booking } = require('../../../database/models');
const { clampPaging, paginated } = require('../../utils/pagination');

const BLOCKING_STATUSES = ['PENDING', 'APPROVED'];
const OWNER_PAGE_SIZE = 6;
const OWNER_MAX_PAGE_SIZE = 50;

async function listByOwner(ownerId, { page = 1, limit = OWNER_PAGE_SIZE } = {}) {
  const { pg, lim } = clampPaging({ page, limit, defLimit: OWNER_PAGE_SIZE, maxLimit: OWNER_MAX_PAGE_SIZE });

  const filter = { owner: ownerId, isDeleted: { $ne: true } };
  const [items, total] = await Promise.all([
    Item.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
    Item.countDocuments(filter),
  ]);

  const statusByItem = await deriveItemStatuses(items.map((i) => i._id));
  return paginated(
    items.map((i) => ({ ...i.toJSON(), status: statusByItem.get(String(i._id)) || availabilityStatus(i) })),
    total,
    pg,
    lim,
  );
}

function availabilityStatus(item) {
  return item.isActive === false
    ? { cls: 'cancelled', label: 'מוסתר' }
    : { cls: 'available', label: 'זמין' };
}

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

async function bookedDates(itemId) {
  const bookings = await Booking.find(
    { item: itemId, status: { $in: BLOCKING_STATUSES } },
    'startDate endDate',
  )
    .sort({ startDate: 1 })
    .lean();

  return bookings.map(({ startDate, endDate }) => ({ startDate, endDate }));
}

module.exports = { listByOwner, bookedDates };
