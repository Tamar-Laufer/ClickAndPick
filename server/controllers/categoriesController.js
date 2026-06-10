'use strict';

const asyncHandler = require('../utils/asyncHandler');
const categoriesService = require('../services/categoriesService');

// POST /api/categories — ADMIN: add a category.
exports.create = asyncHandler(async (req, res) => {
  const category = await categoriesService.create(req.body);
  res.status(201).json({ category });
});

// GET /api/categories — PUBLIC: all categories for forms and filters.
exports.list = asyncHandler(async (_req, res) => {
  const categories = await categoriesService.listAll();
  res.json({ categories });
});
