'use strict';

const asyncHandler = require('../utils/asyncHandler');
const feedbackService = require('../services/feedbackService');

// POST /api/feedback — PUBLIC: anyone submits a question or recommendation.
exports.submit = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submit(req.body);
  res.status(201).json({ feedback });
});

// GET /api/feedback/approved — PUBLIC: approved recommendations for the homepage.
exports.approved = asyncHandler(async (_req, res) => {
  const feedback = await feedbackService.listApproved();
  res.json({ feedback });
});

// GET /api/admin/feedback — ADMIN: the full inbox.
exports.listAll = asyncHandler(async (_req, res) => {
  const feedback = await feedbackService.listAll();
  res.json({ feedback });
});

// PATCH /api/admin/feedback/:id/toggle-approve — ADMIN: flip homepage visibility.
exports.toggleApprove = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.toggleApprove(req.params.id);
  res.json({ feedback });
});
