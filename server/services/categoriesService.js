'use strict';

const { Category } = require('../../database/models');
const { ApiError } = require('../utils/errors');

async function create({ value, color, icon }) {
  const name = (value || '').trim();
  if (!name) throw new ApiError(400, 'שם הקטגוריה חסר');
  return Category.create({
    value: name,
    color: (color || 'coral').trim(),
    icon: (icon || '').trim(),
  });
}

async function listAll() {
  return Category.find().sort({ value: 1 }).lean();
}

async function assertExists(value) {
  if (!value) throw new ApiError(400, 'קטגוריה חסרה');
  const exists = await Category.exists({ value });
  if (!exists) throw new ApiError(400, 'קטגוריה לא קיימת');
}

module.exports = { create, listAll, assertExists };
