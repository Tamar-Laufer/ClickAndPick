'use strict';


require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../../database/db');
const { Item, User } = require('../../database/models');
const { toPoint } = require('../utils/geo');

const DRY_RUN = process.argv.includes('--dry-run');

const FALLBACK_COORDS = [
  Number(process.env.FALLBACK_LNG ?? 35.2137),
  Number(process.env.FALLBACK_LAT ?? 31.7683),
];

async function run() {
  await connectMongo();

  const fallbackPoint = toPoint({ coordinates: FALLBACK_COORDS });
  if (!fallbackPoint) {
    throw new Error(`Invalid FALLBACK coordinates [${FALLBACK_COORDS.join(', ')}] — check FALLBACK_LNG/FALLBACK_LAT.`);
  }

  const items = await Item.find({
    $or: [
      { location: { $exists: false } },
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates': { $size: 0 } },
    ],
  }).select('_id title owner');

  if (!items.length) {
    console.log('All items already have a location — nothing to patch.');
    return;
  }

  console.log(`Patching ${items.length} item(s) without a location${DRY_RUN ? ' [DRY RUN — no writes]' : ''}\n`);

  const ownerCache = new Map();
  let inherited = 0;
  let fellBack = 0;

  for (const item of items) {
    const ownerId = item.owner ? String(item.owner) : null;

    if (ownerId && !ownerCache.has(ownerId)) {
      ownerCache.set(ownerId, await User.findById(ownerId).select('defaultLocation').lean());
    }
    const owner = ownerId ? ownerCache.get(ownerId) : null;

    let point;
    let source;
    if (owner?.defaultLocation?.coordinates?.length === 2) {
      point = toPoint({ coordinates: owner.defaultLocation.coordinates });
      source = 'owner default';
    }
    if (!point) {
      point = fallbackPoint;
      source = 'fallback (city centre)';
    }

    if (source === 'owner default') inherited += 1;
    else fellBack += 1;

    const label = (item.title || String(item._id)).slice(0, 30).padEnd(30);
    console.log(`· ${label} ← ${source.padEnd(22)} [${point.coordinates.join(', ')}]`);

    if (!DRY_RUN) {
      await Item.updateOne({ _id: item._id }, { $set: { location: point } });
    }
  }

  console.log(
    `\nDone. ${inherited} inherited from owner, ${fellBack} used fallback` +
      `${DRY_RUN ? ' (no writes)' : ''}.`,
  );
}

run()
  .then(async () => {
    await disconnectMongo();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Item location backfill failed:', err.message);
    await disconnectMongo().catch(() => {});
    process.exit(1);
  });
