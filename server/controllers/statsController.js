'use strict';

const asyncHandler = require('../utils/asyncHandler');
const statsService = require('../services/statsService');

exports.publicStats = asyncHandler(async (_req, res) => {
  const stats = await statsService.publicCounts();
  res.json({ stats });
});
