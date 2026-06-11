'use strict';

require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../config/db');
const Category = require('../models/Category');

// The four base categories that every seeded Item.category references.
// value  must stay in sync with the keys in seed.js → itemsDataPool.
// color  must be one of Category.COLORS: coral / teal / green / blue / butter
const BASE_CATEGORIES = [
  { value: 'TOOLS', label: 'כלי עבודה', color: 'coral', icon: 'wrench' },
  { value: 'CLEANING', label: 'ניקיון', color: 'teal', icon: 'sparkles' },
  { value: 'EVENTS', label: 'אירועים', color: 'blue', icon: 'star' },
  { value: 'CAMPING', label: 'גינה וחוץ', color: 'green', icon: 'leaf' },
];

async function seedCategories() {
  await connectMongo();
  let created = 0;
  let skipped = 0;

  for (const cat of BASE_CATEGORIES) {
    const exists = await Category.findOne({ value: cat.value });
    if (exists) { skipped++; continue; }
    await Category.create(cat);
    console.log('  created:', cat.value, '-', cat.label);
    created++;
  }

  console.log(`✓ Categories: ${created} created, ${skipped} already existed`);
  await disconnectMongo();
}

seedCategories().catch((err) => { console.error(err.message); process.exit(1); });
