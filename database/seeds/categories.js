'use strict';

require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../db');
const Category = require('../models/Category');

const BASE_CATEGORIES = [
  { value: 'כלי עבודה', color: 'coral', icon: 'wrench' },
  { value: 'ניקיון', color: 'teal', icon: 'sparkles' },
  { value: 'אירועים', color: 'blue', icon: 'star' },
  { value: 'גינה וחוץ', color: 'green', icon: 'leaf' },
];

async function seedCategories() {
  await connectMongo();
  let created = 0;
  let skipped = 0;

  for (const cat of BASE_CATEGORIES) {
    const exists = await Category.findOne({ value: cat.value });
    if (exists) { skipped++; continue; }
    await Category.create(cat);
    console.log('  created:', cat.value);
    created++;
  }

  console.log(`✓ Categories: ${created} created, ${skipped} already existed`);
  await disconnectMongo();
}

seedCategories().catch((err) => { console.error(err.message); process.exit(1); });
