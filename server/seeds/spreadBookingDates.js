'use strict';

/**
 * Non-destructive demo helper: spread existing bookings' `createdAt` across the
 * last 6 months so the "revenue by month" chart shows real history instead of a
 * single bar (the main seed inserts everything "today"). Only touches createdAt.
 *
 *   node seeds/spreadBookingDates.js
 */
require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../config/db');
const { Booking } = require('../models');

const MONTHS_BACK = 6;

async function run() {
  await connectMongo();

  const bookings = await Booking.find().select('_id');
  if (!bookings.length) {
    console.log('No bookings found — run `node seeds/seed.js` first.');
    return;
  }

  const now = Date.now();
  const span = MONTHS_BACK * 30 * 24 * 60 * 60 * 1000; // ~6 months in ms

  // backdate each booking to a random moment within the last 6 months.
  // NOTE: Mongoose makes `createdAt` immutable under timestamps:true, so a
  // normal model update silently drops it. Go through the raw driver
  // (Booking.collection) to bypass that and actually write the new date.
  const ops = bookings.map((b) => ({
    updateOne: {
      filter: { _id: b._id },
      update: { $set: { createdAt: new Date(now - Math.random() * span) } },
    },
  }));

  const res = await Booking.collection.bulkWrite(ops);
  console.log(`✓ spread ${res.modifiedCount} bookings across the last ${MONTHS_BACK} months.`);
}

run()
  .then(async () => { await disconnectMongo(); process.exit(0); })
  .catch(async (err) => {
    console.error('Spreading dates failed:', err.message);
    await disconnectMongo().catch(() => {});
    process.exit(1);
  });
