'use strict';

/* One-time migration: collapse Category to a single Hebrew `value` field.
   Renames the four English-coded categories to their Hebrew name, repoints
   existing items at the new value, and drops the now-removed `label` field.
   Idempotent — safe to run more than once. Run: node database/seeds/migrateCategoriesHebrew.js */
require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../db');
const Category = require('../models/Category');
const Item = require('../models/Item');

const RENAME = {
  TOOLS: 'כלי עבודה',
  CLEANING: 'ניקיון',
  EVENTS: 'אירועים',
  CAMPING: 'גינה וחוץ',
};

async function run() {
  await connectMongo();

  for (const [oldVal, newVal] of Object.entries(RENAME)) {
    // 1) repoint every item that still references the English code
    const res = await Item.updateMany({ category: oldVal }, { $set: { category: newVal } });

    // 2) rename the category document (or drop it if a Hebrew one already exists)
    const oldDoc = await Category.findOne({ value: oldVal });
    if (oldDoc) {
      const clash = await Category.findOne({ value: newVal });
      if (clash && String(clash._id) !== String(oldDoc._id)) {
        await Category.deleteOne({ _id: oldDoc._id });
      } else {
        oldDoc.value = newVal;
        await oldDoc.save();
      }
    }
    console.log(`  ${oldVal} → ${newVal}: ${res.modifiedCount} items repointed`);
  }

  // 3) strip the removed `label` field from every category document
  const cleared = await Category.collection.updateMany({ label: { $exists: true } }, { $unset: { label: '' } });
  console.log(`✓ Migration done. Cleared label from ${cleared.modifiedCount} categories.`);

  await disconnectMongo();
}

run().catch((err) => { console.error(err.message); process.exit(1); });
