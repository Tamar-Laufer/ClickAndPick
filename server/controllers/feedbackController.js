'use strict';

const asyncHandler = require('../utils/asyncHandler');
const feedbackService = require('../services/feedbackService');

exports.submit = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submit(req.body);
  res.status(201).json({ feedback });
});

exports.approved = asyncHandler(async (_req, res) => {
  const feedback = await feedbackService.listApproved();
  res.json({ feedback });
});

exports.listAll = asyncHandler(async (req, res) => {
  const { feedback, approvedCount, pagination } = await feedbackService.listAll(req.query);
  res.json({ feedback, approvedCount, pagination });
});

exports.toggleApprove = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.toggleApprove(req.params.id);
  res.json({ feedback });
});
