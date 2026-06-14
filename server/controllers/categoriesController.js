'use strict';

const asyncHandler = require('../utils/asyncHandler');
const categoriesService = require('../services/categoriesService');

exports.create = asyncHandler(async (req, res) => {
  const category = await categoriesService.create(req.body);
  res.status(201).json({ category });
});

exports.list = asyncHandler(async (_req, res) => {
  const categories = await categoriesService.listAll();
  res.json({ categories });
});
