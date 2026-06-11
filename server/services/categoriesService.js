'use strict';

const { Category } = require('../../database/models');
const { ApiError } = require('../utils/errors');

/**
 * Admin: create a category. The admin supplies a Hebrew `label` (+ optional
 * colour/icon); the stored `value` defaults to the label when no explicit
 * code is given, which is fine since `value` only has to be unique and stable.
 * The unique index on `value` guarantees no duplicates — a clash surfaces as a
 * Mongo 11000 error, mapped to a 409 by the global error handler.
 */
async function create({ label, value, color, icon }) {
  const lbl = (label || '').trim();
  if (!lbl) throw new ApiError(400, 'שם הקטגוריה חסר');
  return Category.create({
    value: (value || lbl).trim(),
    label: lbl,
    color: (color || 'coral').trim(),
    icon: (icon || '').trim(),
  });
}

/** Public: every category, alphabetical by label — feeds forms and filters. */
async function listAll() {
  return Category.find().sort({ label: 1 }).lean();
}

/**
 * Throw 400 unless `value` matches an existing category. Used when creating /
 * editing items so an item can't be filed under a category that doesn't exist.
 */
async function assertExists(value) {
  if (!value) throw new ApiError(400, 'קטגוריה חסרה');
  const exists = await Category.exists({ value });
  if (!exists) throw new ApiError(400, 'קטגוריה לא קיימת');
}

module.exports = { create, listAll, assertExists };
