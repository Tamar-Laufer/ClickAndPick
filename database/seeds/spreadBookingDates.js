'use strict';

require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../db');
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
  const span = MONTHS_BACK * 30 * 24 * 60 * 60 * 1000; 
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
