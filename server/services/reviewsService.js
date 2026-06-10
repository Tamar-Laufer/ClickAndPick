'use strict';

const { Review, Booking, User } = require('../models');
const { ApiError } = require('../utils/errors');

const REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * After a User-target review is revealed and Review.recalculate() has refreshed
 * that user's averageRenterRating, recompute their Trust Score (the Quality term
 * depends on it). No-op for Item targets. Best-effort — never blocks the reveal.
 */
async function refreshTrustScore(targetModel, targetId) {
  if (targetModel !== 'User') return;
  const user = await User.findById(targetId);
  if (user) await user.calculateTrustScore();
}

/**
 * Submit one side of a two-way review for a COMPLETED booking.
 * Double-blind: the new review is saved hidden; only when the OTHER party
 * has also reviewed do BOTH become public (and the averages recalculated).
 *
 * The acting user is taken from the JWT (passed in as `user`), never trusted
 * from the request body.
 */
async function submitReview(user, bookingId, { rating, comment }) {
  if (rating == null || rating < 1 || rating > 5) throw new ApiError(400, 'הדירוג חייב להיות בין 1 ל-5');

  const booking = await Booking.findById(bookingId).populate('item', 'owner');
  if (!booking) throw new ApiError(404, 'ההזמנה לא נמצאה');
  if (booking.status !== 'COMPLETED') throw new ApiError(400, 'ניתן לדרג רק לאחר שההשאלה הושלמה');

  // is the review window still open?
  const completedAt = booking.completedAt || booking.updatedAt;
  if (Date.now() > completedAt.getTime() + REVIEW_WINDOW_MS) {
    throw new ApiError(400, 'חלון הביקורת (7 ימים) נסגר');
  }

  // who is reviewing whom?  renter → Item,  owner → renter(User)
  const isRenter = String(booking.renter) === String(user.id);
  const isOwner = String(booking.item.owner) === String(user.id);
  if (!isRenter && !isOwner) throw new ApiError(403, 'רק המשתתפים בהשאלה יכולים לדרג');

  const target = isRenter
    ? { targetModel: 'Item', targetId: booking.item._id }
    : { targetModel: 'User', targetId: booking.renter };

  // create this side's review (hidden for now). The unique (bookingId,reviewerId)
  // index makes a second submission by the same user fail cleanly.
  let myReview;
  try {
    myReview = await Review.create({
      reviewerId: user.id,
      ...target,
      bookingId,
      rating,
      comment: comment || '',
      isPublic: false,
    });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'כבר השארת ביקורת על השאלה זו');
    throw err;
  }

  // has the OTHER party already reviewed this booking?
  const otherReview = await Review.findOne({ bookingId, reviewerId: { $ne: user.id } });

  if (otherReview) {
    // both sides are in → reveal both and refresh the affected averages
    myReview.isPublic = true;
    otherReview.isPublic = true;
    await Promise.all([myReview.save(), otherReview.save()]);
    await Promise.all([
      Review.recalculate(myReview.targetModel, myReview.targetId),
      Review.recalculate(otherReview.targetModel, otherReview.targetId),
    ]);
    // a renter (User) review just went public → refresh their Trust Score
    await Promise.all([
      refreshTrustScore(myReview.targetModel, myReview.targetId),
      refreshTrustScore(otherReview.targetModel, otherReview.targetId),
    ]);
    return { review: myReview, revealed: true };
  }

  // otherwise it stays hidden until the other party submits (or the window expires)
  return { review: myReview, revealed: false };
}

/**
 * Reveal reviews whose 7-day window has expired even though only one side
 * submitted. Intended to be run periodically (cron) — returns how many it
 * revealed. Safe to call repeatedly.
 */
async function revealExpiredReviews() {
  const cutoff = new Date(Date.now() - REVIEW_WINDOW_MS);
  const expired = await Booking.find({ status: 'COMPLETED', completedAt: { $lt: cutoff } }).select('_id');

  const stale = await Review.find({ isPublic: false, bookingId: { $in: expired.map((b) => b._id) } });
  if (!stale.length) return 0;

  await Review.updateMany({ _id: { $in: stale.map((r) => r._id) } }, { isPublic: true });
  // recalc each distinct target that changed
  const seen = new Set();
  for (const r of stale) {
    const key = `${r.targetModel}:${r.targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await Review.recalculate(r.targetModel, r.targetId);
    await refreshTrustScore(r.targetModel, r.targetId);
  }
  return stale.length;
}

/** Public reviews for an item (used to show ratings on the item page). */
async function listItemReviews(itemId) {
  return Review.find({ targetModel: 'Item', targetId: itemId, isPublic: true })
    .populate('reviewerId', 'firstName lastName avatarUrl')
    .sort({ createdAt: -1 });
}

module.exports = { submitReview, revealExpiredReviews, listItemReviews };
