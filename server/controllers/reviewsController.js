'use strict';

const asyncHandler = require('../utils/asyncHandler');
const reviewsService = require('../services/reviewsService');

exports.submit = asyncHandler(async (req, res) => {
  const result = await reviewsService.submitReview(req.user, req.params.id, req.body);
  res.status(201).json(result);
});

exports.itemReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.listItemReviews(req.params.id);
  res.json({ reviews });
});
