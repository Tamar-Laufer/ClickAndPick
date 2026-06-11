'use strict';

const { User, Item, Booking } = require('../../database/models');
const { ApiError } = require('../utils/errors');

/**
 * The platform's earning on a booking is its `platformFee`. Bookings created
 * before the commission feature shipped have no platformFee, so we fall back to
 * deriving it on the fly (totalPrice * rate) — keeps historical/seed revenue
 * accurate without a data backfill. New bookings always store the real value.
 */
const PLATFORM_FEE_EXPR = {
  $ifNull: ['$platformFee', { $multiply: ['$totalPrice', Booking.PLATFORM_FEE_RATE] }],
};

// The site manager's personal cut: 5% of each completed transaction's GROSS
// value (totalPrice). This is a reporting figure for the admin dashboard only —
// it does NOT change the 10% platform fee charged on bookings.
const MANAGER_COMMISSION_RATE = 0.05;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Users list for the admin table, enriched with each user's activity counts:
 *   bookingCount — bookings they made as a renter
 *   itemCount    — items they own
 * Two grouped aggregations (not per-user queries) keep this O(1) round-trips.
 */
async function listUsers() {
  const [users, bookingCounts, itemCounts] = await Promise.all([
    User.find().sort({ createdAt: -1 }),
    Booking.aggregate([{ $group: { _id: '$renter', n: { $sum: 1 } } }]),
    Item.aggregate([{ $group: { _id: '$owner', n: { $sum: 1 } } }]),
  ]);
  const bMap = new Map(bookingCounts.map((r) => [String(r._id), r.n]));
  const iMap = new Map(itemCounts.map((r) => [String(r._id), r.n]));
  return users.map((u) => ({
    ...u.toJSON(),
    bookingCount: bMap.get(String(u._id)) || 0,
    itemCount: iMap.get(String(u._id)) || 0,
  }));
}

async function setUserActive(id, isActive) {
  const user = await User.findByIdAndUpdate(id, { isActive: !!isActive }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function setUserRole(id, role) {
  if (!User.ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
  const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

/**
 * Total platform revenue = sum of the platform's COMMISSION (platformFee), not
 * the gross totalPrice, across COMPLETED bookings.
 * Pipeline:
 *   $match → keep only bookings the platform actually earned on (COMPLETED).
 *            Filtering first means $group scans far fewer docs and can use the
 *            { status } index.
 *   $group → _id:null collapses every matched doc into ONE bucket, and
 *            $sum of the platform-fee expression adds the commission across it.
 * aggregate() returns [] when there are no COMPLETED bookings, so we default to 0.
 */
async function totalRevenue() {
  const [row] = await Booking.aggregate([
    { $match: { status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: PLATFORM_FEE_EXPR } } },
  ]);
  return row ? row.total : 0;
}

/**
 * Count bookings per status — drives the "bookings by status" bar chart.
 * $group with _id:'$status' makes one bucket per distinct status value and
 * $sum:1 counts the docs in each. Returns e.g. [{ status:'COMPLETED', count:152 }].
 */
async function bookingsByStatus() {
  const rows = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ status: r._id, count: r.count }));
}

/**
 * Platform revenue per calendar month (COMPLETED bookings only) — drives the
 * revenue line/bar chart. Pipeline:
 *   $match → COMPLETED only (the earned revenue).
 *   $group → bucket by {year, month} of createdAt, summing the platform fee.
 *   $sort  → chronological order so the chart reads left-to-right.
 * The _id stays a {y,m} object; we flatten it to a 'YYYY-MM' label in JS.
 */
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

/**
 * The site manager's personal earnings = MANAGER_COMMISSION_RATE (5%) of the
 * GROSS value of COMPLETED bookings, returned both as a cumulative total and
 * broken down per calendar month for the dashboard chart.
 */
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
    Item.countDocuments({ isActive: true }),
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
    // manager's personal 5%-of-gross earnings (dashboard reporting only)
    managerRate: MANAGER_COMMISSION_RATE,
    managerEarnings: manager.total,
    managerEarningsByMonth: manager.byMonth,
  };
}

/**
 * Content moderation — flip an item's `isActive` flag (soft delete).
 * A suspended item stays in the DB (bookings/history intact) but is hidden
 * from public listings. Reading the current value then writing its negation
 * keeps the endpoint a pure toggle.
 */
async function toggleItemActive(id) {
  const item = await Item.findById(id);
  if (!item) throw new ApiError(404, 'Item not found');
  item.isActive = !item.isActive;
  await item.save();
  return item;
}

module.exports = { listUsers, setUserActive, setUserRole, stats, toggleItemActive };
