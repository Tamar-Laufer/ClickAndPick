'use strict';

/**
 * Seed the four original categories so existing items (whose `category` is one
 * of these codes) keep resolving after the move from a hard-coded enum to the
 * admin-managed Category collection. Idempotent: upserts by `value`, so it is
 * safe to run repeatedly and won't clobber an admin's colour/label edits via
 * insert (it only sets fields on insert).
 *
 *   Run standalone:  node seeds/categories.js
 *   Or import seedCategories() and call it after connectMongo().
 *
 * Labels/colours mirror the client's former static config (config/categories.js).
 */
require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../config/db');
const { Category } = require('../models');
const logger = require('../utils/logger');

const DEFAULT_CATEGORIES = [
  { value: 'TOOLS', label: 'כלי עבודה', color: 'coral' },
  { value: 'CAMPING', label: 'גינון וחוץ', color: 'green' },
  { value: 'EVENTS', label: 'אירועים', color: 'teal' },
  { value: 'CLEANING', label: 'ניקיון', color: 'blue' },
];

async function seedCategories() {
  const ops = DEFAULT_CATEGORIES.map((c) => ({
    updateOne: {
      filter: { value: c.value },
      // $setOnInsert: only write on first insert, never overwrite later edits
      update: { $setOnInsert: c },
      upsert: true,
    },
  }));
  const res = await Category.bulkWrite(ops);
  return res.upsertedCount || 0;
}

module.exports = { seedCategories, DEFAULT_CATEGORIES };

// allow running this file directly
if (require.main === module) {
  (async () => {
    await connectMongo();
    const inserted = await seedCategories();
    logger.info(`Categories seeded (${inserted} new, ${DEFAULT_CATEGORIES.length} total ensured)`);
    await disconnectMongo();
    process.exit(0);
  })().catch((err) => {
    logger.error(err.stack || err.message);
    process.exit(1);
  });
}
