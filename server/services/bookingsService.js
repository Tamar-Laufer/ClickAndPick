'use strict';

const { Booking, Item, User, Review } = require('../../database/models');
const { ApiError } = require('../utils/errors');
const { clampPaging, paginationMeta } = require('../utils/pagination');
const emailService = require('./emailService');

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ACTIVE_STATUSES = ['PENDING', 'APPROVED'];
const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 50;

const money = (n) => Math.round(n * 100) / 100;

const pageOpts = (opts) => clampPaging({ ...opts, defLimit: DEFAULT_PAGE_SIZE, maxLimit: MAX_PAGE_SIZE });

async function listPage(filter, decorate, opts) {
  const { pg, lim } = pageOpts(opts);
  const [bookings, total] = await Promise.all([
    decorate(Booking.find(filter)).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
    Booking.countDocuments(filter),
  ]);
  return { bookings, pagination: paginationMeta(pg, lim, total) };
}

// Flags each booking with whether `userId` already left a review on it, so the
// client can disable the "leave a review" button. Returns plain (toJSON) objects.
async function attachMyReview(result, userId) {
  if (!result.bookings.length) return result;
  const ids = result.bookings.map((b) => b._id);
  const reviewedIds = await Review.find({ bookingId: { $in: ids }, reviewerId: userId }).distinct('bookingId');
  const reviewed = new Set(reviewedIds.map(String));
  result.bookings = result.bookings.map((b) => {
    const obj = b.toJSON();
    obj.myReviewSubmitted = reviewed.has(String(b._id));
    return obj;
  });
  return result;
}

async function create(renterId, { item: itemId, startDate, endDate }) {
  if (!itemId || !startDate || !endDate) throw new ApiError(400, 'item, startDate and endDate are required');

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'Invalid dates');
  if (end <= start) throw new ApiError(400, 'End date must be after start date');

  const item = await Item.findById(itemId);
  if (!item || !item.isActive || item.isDeleted) throw new ApiError(404, 'Item is not available');
  if (String(item.owner) === String(renterId)) throw new ApiError(400, 'You cannot book your own item');

  const clash = await Booking.exists({
    item: itemId,
    status: { $in: ACTIVE_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
  });
  if (clash) throw new ApiError(409, 'The item is already booked for these dates');

  const days = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
  const totalPrice = money(days * item.dailyRate);
  const platformFee = money(totalPrice * Booking.PLATFORM_FEE_RATE);
  const ownerEarnings = money(totalPrice - platformFee);

  const booking = await Booking.create({
    item: itemId,
    renter: renterId,
    startDate: start,
    endDate: end,
    totalPrice,
    platformFee,
    ownerEarnings,
  });

  emailService.notifyNewBookingRequest(booking.id);

  return booking;
}

async function listMine(renterId, opts) {
  const result = await listPage(
    { renter: renterId },
    (q) => q.populate({
      path: 'item',
      select: 'title imageUrl dailyRate category owner',
      populate: { path: 'owner', select: 'firstName lastName avatarUrl' },
    }),
    opts,
  );
  return attachMyReview(result, renterId);
}

async function listIncoming(ownerId, opts) {
  const owned = await Item.find({ owner: ownerId }).select('_id').lean();
  const result = await listPage(
    { item: { $in: owned.map((i) => i._id) } },
    (q) => q.populate('item', 'title imageUrl').populate('renter', 'firstName lastName email avatarUrl'),
    opts,
  );
  return attachMyReview(result, ownerId);
}

async function getById(id, user) {
  const booking = await Booking.findById(id)
    .populate('item')
    .populate('renter', 'firstName lastName email avatarUrl');
  if (!booking) throw new ApiError(404, 'Booking not found');
  ensureParticipant(booking, user);
  return booking;
}

async function updateStatus(id, user, status) {
  const booking = await Booking.findById(id).populate('item', 'owner');
  if (!booking) throw new ApiError(404, 'Booking not found');

  const isRenter = String(booking.renter) === String(user.id);
  const isOwner = String(booking.item.owner) === String(user.id);
  const isAdmin = user.role === 'ADMIN';
  if (!isRenter && !isOwner && !isAdmin) throw new ApiError(403, 'Not allowed');

  const allowed = isOwner || isAdmin ? ['APPROVED', 'COMPLETED', 'CANCELLED'] : ['CANCELLED'];
  if (!allowed.includes(status)) throw new ApiError(403, `You cannot set status to ${status}`);

  if (status === 'COMPLETED' && new Date(booking.startDate) > new Date()) {
    throw new ApiError(400, 'לא ניתן לסמן כהוחזר לפני שתקופת ההשאלה התחילה');
  }

  const prevStatus = booking.status;
  const firstCompletion = status === 'COMPLETED' && prevStatus !== 'COMPLETED';
  const cancelledAfterApproval = status === 'CANCELLED' && prevStatus === 'APPROVED';

  booking.status = status;
  if (status === 'COMPLETED' && !booking.completedAt) booking.completedAt = new Date();
  await booking.save();

  if (firstCompletion) {
    emailService.notifyBookingCompleted(booking.id);
    await bumpRenterReputation(booking.renter, { completed: 1 });
  } else if (cancelledAfterApproval) {
    await bumpRenterReputation(booking.renter, { cancelled: 1 });
  }

  if ((isOwner || isAdmin) && (status === 'APPROVED' || status === 'CANCELLED')) {
    emailService.notifyBookingStatusChange(booking.id, status);
  }

  return booking;
}

async function bumpRenterReputation(renterId, { completed = 0, cancelled = 0 }) {
  try {
    const inc = {};
    if (completed) inc.completedTransactions = completed;
    if (cancelled) inc.cancelledTransactions = cancelled;
    if (!Object.keys(inc).length) return;

    const user = await User.findByIdAndUpdate(renterId, { $inc: inc }, { new: true });
    if (user) await user.calculateTrustScore();
  } catch (err) {
    require('../utils/logger').error(`bumpRenterReputation(${renterId}) failed: ${err.message}`);
  }
}

function ensureParticipant(booking, user) {
  const renterId = String(booking.renter._id || booking.renter);
  const ownerId = String(booking.item.owner);
  if (renterId !== String(user.id) && ownerId !== String(user.id) && user.role !== 'ADMIN') {
    throw new ApiError(403, 'Not allowed');
  }
}

module.exports = { create, listMine, listIncoming, getById, updateStatus };
