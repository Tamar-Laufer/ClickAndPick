'use strict';

const { User, Item, Booking } = require('../../database/models');
const { ApiError } = require('../utils/errors');
const { clampPaging, paginationMeta, paginated } = require('../utils/pagination');

const ADMIN_DEFAULT_LIMIT = 20;
const ADMIN_MAX_LIMIT = 100;

const PLATFORM_FEE_EXPR = {
  $ifNull: ['$platformFee', { $multiply: ['$totalPrice', Booking.PLATFORM_FEE_RATE] }],
};

const MANAGER_COMMISSION_RATE = 0.1;
const round2 = (n) => Math.round(n * 100) / 100;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function listUsers({ page = 1, limit = 20, q = '' } = {}) {
  const { pg, lim } = clampPaging({ page, limit, defLimit: ADMIN_DEFAULT_LIMIT, maxLimit: ADMIN_MAX_LIMIT });

  const filter = {};
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
    User.countDocuments(filter),
  ]);

  const ids = users.map((u) => u._id);
  const [bookingCounts, itemCounts] = await Promise.all([
    Booking.aggregate([{ $match: { renter: { $in: ids } } }, { $group: { _id: '$renter', n: { $sum: 1 } } }]),
    Item.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]),
  ]);
  const bMap = new Map(bookingCounts.map((r) => [String(r._id), r.n]));
  const iMap = new Map(itemCounts.map((r) => [String(r._id), r.n]));

  return {
    users: users.map((u) => ({
      ...u.toJSON(),
      bookingCount: bMap.get(String(u._id)) || 0,
      itemCount: iMap.get(String(u._id)) || 0,
    })),
    pagination: paginationMeta(pg, lim, total),
  };
}

async function toggleUserActive(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  user.isActive = !user.isActive;
  await user.save({ validateModifiedOnly: true });
  return user;
}

async function setUserRole(id, role) {
  if (!User.ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
  const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function totalRevenue() {
  const [row] = await Booking.aggregate([
    { $match: { status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: PLATFORM_FEE_EXPR } } },
  ]);
  return row ? row.total : 0;
}

async function bookingsByStatus() {
  const rows = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ status: r._id, count: r.count }));
}

async function revenueByMonth() {
  const rows = await Booking.aggregate([
    { $match: { status: 'COMPLETED' } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        total: { $sum: PLATFORM_FEE_EXPR },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  return rows.map((r) => ({
    month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
    total: r.total,
  }));
}

async function managerEarnings() {
  const rows = await Booking.aggregate([
    { $match: { status: 'COMPLETED' } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        gross: { $sum: '$totalPrice' },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  const byMonth = rows.map((r) => ({
    month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
    total: round2(r.gross * MANAGER_COMMISSION_RATE),
  }));
  const total = round2(byMonth.reduce((a, r) => a + r.total, 0));
  return { total, byMonth };
}

async function stats() {
  const [users, items, activeItems, bookings, revenue, byStatus, byMonth, manager] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Item.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
    Booking.countDocuments(),
    totalRevenue(),
    bookingsByStatus(),
    revenueByMonth(),
    managerEarnings(),
  ]);
  return {
    users,
    items,
    activeItems,
    bookings,
    revenue,
    bookingsByStatus: byStatus,
    revenueByMonth: byMonth,
    managerRate: MANAGER_COMMISSION_RATE,
    managerEarnings: manager.total,
    managerEarningsByMonth: manager.byMonth,
  };
}

async function toggleItemActive(id) {
  const item = await Item.findById(id);
  if (!item) throw new ApiError(404, 'Item not found');
  item.isActive = !item.isActive;
  await item.save();
  return item;
}

async function listItems({ page = 1, limit = 20, q = '' } = {}) {
  const { pg, lim } = clampPaging({ page, limit, defLimit: ADMIN_DEFAULT_LIMIT, maxLimit: ADMIN_MAX_LIMIT });

  const filter = { isDeleted: { $ne: true } };
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    filter.$or = [{ title: rx }, { category: rx }];
  }

  const [items, total] = await Promise.all([
    Item.find(filter).populate('owner', 'firstName lastName').sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
    Item.countDocuments(filter),
  ]);

  return paginated(items, total, pg, lim);
}

module.exports = { listUsers, toggleUserActive, setUserRole, stats, toggleItemActive, listItems };
