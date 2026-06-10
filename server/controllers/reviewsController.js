'use strict';

const asyncHandler = require('../utils/asyncHandler');
const reviewsService = require('../services/reviewsService');

// POST /api/bookings/:id/reviews — submit one side of the two-way review.
// req.user comes from verifyToken (the JWT), so the reviewer can't be spoofed.
exports.submit = asyncHandler(async (req, res) => {
  const result = await reviewsService.submitReview(req.user, req.params.id, req.body);
  res.status(201).json(result); // { review, revealed }
});

// GET /api/items/:id/reviews — public reviews for an item
exports.itemReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.listItemReviews(req.params.id);
  res.json({ reviews });
});
