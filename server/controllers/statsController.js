'use strict';

const asyncHandler = require('../utils/asyncHandler');
const statsService = require('../services/statsService');

// GET /api/stats — PUBLIC: community counts for the homepage stats band.
exports.publicStats = asyncHandler(async (_req, res) => {
  const stats = await statsService.publicCounts();
  res.json({ stats });
});
