'use strict';

const { Review, Booking, User } = require('../../database/models');
const { ApiError } = require('../utils/errors');

const REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function refreshTrustScore(targetModel, targetId) {
  if (targetModel !== 'User') return;
  const user = await User.findById(targetId);
  if (user) await user.calculateTrustScore();
}

async function submitReview(user, bookingId, { rating, comment }) {
  if (rating == null || rating < 1 || rating > 5) throw new ApiError(400, 'הדירוג חייב להיות בין 1 ל-5');

  const booking = await Booking.findById(bookingId).populate('item', 'owner');
  if (!booking) throw new ApiError(404, 'ההזמנה לא נמצאה');
  if (booking.status !== 'COMPLETED') throw new ApiError(400, 'ניתן לדרג רק לאחר שההשאלה הושלמה');

  const completedAt = booking.completedAt || booking.updatedAt;
  if (Date.now() > completedAt.getTime() + REVIEW_WINDOW_MS) {
    throw new ApiError(400, 'חלון הביקורת (7 ימים) נסגר');
  }

  const isRenter = String(booking.renter) === String(user.id);
  const isOwner = String(booking.item.owner) === String(user.id);
  if (!isRenter && !isOwner) throw new ApiError(403, 'רק המשתתפים בהשאלה יכולים לדרג');

  const target = isRenter
    ? { targetModel: 'Item', targetId: booking.item._id }
    : { targetModel: 'User', targetId: booking.renter };

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

  const otherReview = await Review.findOne({ bookingId, reviewerId: { $ne: user.id } });

  if (otherReview) {
    myReview.isPublic = true;
    otherReview.isPublic = true;
    await Promise.all([myReview.save(), otherReview.save()]);
    await Promise.all([
      Review.recalculate(myReview.targetModel, myReview.targetId),
      Review.recalculate(otherReview.targetModel, otherReview.targetId),
    ]);
    await Promise.all([
      refreshTrustScore(myReview.targetModel, myReview.targetId),
      refreshTrustScore(otherReview.targetModel, otherReview.targetId),
    ]);
    return { review: myReview, revealed: true };
  }

  return { review: myReview, revealed: false };
}

async function revealExpiredReviews() {
  const cutoff = new Date(Date.now() - REVIEW_WINDOW_MS);
  const expired = await Booking.find({ status: 'COMPLETED', completedAt: { $lt: cutoff } }).select('_id').lean();

  const stale = await Review.find({ isPublic: false, bookingId: { $in: expired.map((b) => b._id) } }).lean();
  if (!stale.length) return 0;

  await Review.updateMany({ _id: { $in: stale.map((r) => r._id) } }, { isPublic: true });
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

async function listItemReviews(itemId) {
  return Review.find({ targetModel: 'Item', targetId: itemId, isPublic: true })
    .populate('reviewerId', 'firstName lastName avatarUrl')
    .sort({ createdAt: -1 });
}

module.exports = { submitReview, revealExpiredReviews, listItemReviews };
