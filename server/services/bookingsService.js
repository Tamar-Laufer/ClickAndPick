'use strict';

const { Booking, Item, User } = require('../models');
const { ApiError } = require('../utils/errors');
const emailService = require('./emailService');

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ACTIVE_STATUSES = ['PENDING', 'APPROVED'];

/** Round a money amount to 2 decimals (avoids float drift like 4.500000001). */
const money = (n) => Math.round(n * 100) / 100;

/** Create a booking: validates dates, availability, ownership and computes price. */
async function create(renterId, { item: itemId, startDate, endDate }) {
  if (!itemId || !startDate || !endDate) throw new ApiError(400, 'item, startDate and endDate are required');

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'Invalid dates');
  if (end <= start) throw new ApiError(400, 'End date must be after start date');

  const item = await Item.findById(itemId);
  if (!item || !item.isActive) throw new ApiError(404, 'Item is not available');
  if (String(item.owner) === String(renterId)) throw new ApiError(400, 'You cannot book your own item');

  // overlap with any still-active booking for the same item
  const clash = await Booking.exists({
    item: itemId,
    status: { $in: ACTIVE_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
  });
  if (clash) throw new ApiError(409, 'The item is already booked for these dates');

  const days = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
  const totalPrice = money(days * item.dailyRate);

  // Split the fee server-side. The renter pays totalPrice; the platform keeps
  // PLATFORM_FEE_RATE of it and the owner is paid the remainder. ownerEarnings
  // is derived by subtraction (not a second %), so fee + earnings === totalPrice
  // exactly. Client-supplied amounts are ignored — these are the source of truth.
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

  // Trigger 1 — email the owner about the new PENDING request.
  // Fire-and-forget: it self-handles errors and must never block/break booking.
  emailService.notifyNewBookingRequest(booking.id);

  return booking;
}

/** Bookings the user has made (as renter) — includes who they're renting from. */
async function listMine(renterId) {
  return Booking.find({ renter: renterId })
    .populate({
      path: 'item',
      select: 'title imageUrl dailyRate category owner',
      populate: { path: 'owner', select: 'firstName lastName avatarUrl' },
    })
    .sort({ createdAt: -1 });
}

/** Bookings on items the user owns (incoming requests). */
async function listIncoming(ownerId) {
  const owned = await Item.find({ owner: ownerId }).select('_id');
  return Booking.find({ item: { $in: owned.map((i) => i._id) } })
    .populate('item', 'title imageUrl')
    .populate('renter', 'firstName lastName email avatarUrl')
    .sort({ createdAt: -1 });
}

async function getById(id, user) {
  const booking = await Booking.findById(id)
    .populate('item')
    .populate('renter', 'firstName lastName email avatarUrl');
  if (!booking) throw new ApiError(404, 'Booking not found');
  ensureParticipant(booking, user);
  return booking;
}

/**
 * Transition a booking's status.
 *  - Owner/Admin may set APPROVED, COMPLETED or CANCELLED.
 *  - The renter may only CANCEL their own pending/approved booking.
 */
async function updateStatus(id, user, status) {
  const booking = await Booking.findById(id).populate('item', 'owner');
  if (!booking) throw new ApiError(404, 'Booking not found');

  const isRenter = String(booking.renter) === String(user.id);
  const isOwner = String(booking.item.owner) === String(user.id);
  const isAdmin = user.role === 'ADMIN';
  if (!isRenter && !isOwner && !isAdmin) throw new ApiError(403, 'Not allowed');

  const allowed = isOwner || isAdmin ? ['APPROVED', 'COMPLETED', 'CANCELLED'] : ['CANCELLED'];
  if (!allowed.includes(status)) throw new ApiError(403, `You cannot set status to ${status}`);

  // capture the prior status BEFORE mutating — needed to detect a first-time
  // COMPLETED transition and a cancellation of an already-APPROVED booking.
  const prevStatus = booking.status;
  const firstCompletion = status === 'COMPLETED' && prevStatus !== 'COMPLETED';
  const cancelledAfterApproval = status === 'CANCELLED' && prevStatus === 'APPROVED';

  booking.status = status;
  if (status === 'COMPLETED' && !booking.completedAt) booking.completedAt = new Date();
  await booking.save();

  if (firstCompletion) {
    // Trigger 3 — "item returned": email BOTH parties their review invitations.
    emailService.notifyBookingCompleted(booking.id);
    // Volume term: count this completed rental toward the renter's trust score.
    await bumpRenterReputation(booking.renter, { completed: 1 });
  } else if (cancelledAfterApproval) {
    // Reliability term: a cancel after approval dents the renter's trust score.
    await bumpRenterReputation(booking.renter, { cancelled: 1 });
  }

  // Trigger 2 — notify the renter when the OWNER/ADMIN approves or declines.
  // (Skip when the renter cancels their own booking — they already know.)
  if ((isOwner || isAdmin) && (status === 'APPROVED' || status === 'CANCELLED')) {
    emailService.notifyBookingStatusChange(booking.id, status);
  }

  return booking;
}

/**
 * Atomically bump a renter's transaction counters, then refresh their Trust
 * Score from the new values. Counters are incremented with $inc (race-safe);
 * the score is then recomputed on a fresh document. Best-effort — a failure
 * here must never break the status transition, so it self-logs and swallows.
 */
async function bumpRenterReputation(renterId, { completed = 0, cancelled = 0 }) {
  try {
    const inc = {};
    if (completed) inc.completedTransactions = completed;
    if (cancelled) inc.cancelledTransactions = cancelled;
    if (!Object.keys(inc).length) return;

    const user = await User.findByIdAndUpdate(renterId, { $inc: inc }, { new: true });
    if (user) await user.calculateTrustScore(); // recompute + persist trustScore
  } catch (err) {
    // eslint-disable-next-line global-require
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
