'use strict';


require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../../database/db');
const { User, Booking, Review } = require('../../database/models');

const DRY_RUN = process.argv.includes('--dry-run');
const IGNORE_CANCELLATIONS = process.argv.includes('--ignore-cancellations');

async function run() {
  await connectMongo();

  const users = await User.find().select('_id firstName lastName trustScore');
  if (!users.length) {
    console.log('No users found — nothing to backfill.');
    return;
  }

  console.log(
    `Backfilling Trust Scores for ${users.length} user(s)` +
      `${DRY_RUN ? ' [DRY RUN — no writes]' : ''}` +
      `${IGNORE_CANCELLATIONS ? ' [legacy cancellations ignored]' : ''}\n`,
  );

  let updated = 0;
  let unchanged = 0;

  for (const stub of users) {
    const userId = stub._id;

    const [completed, cancelled] = await Promise.all([
      Booking.countDocuments({ renter: userId, status: 'COMPLETED' }),
      IGNORE_CANCELLATIONS
        ? Promise.resolve(0)
        : Booking.countDocuments({ renter: userId, status: 'CANCELLED' }),
    ]);

    if (!DRY_RUN) await Review.recalculate('User', userId);

    const user = await User.findById(userId);
    if (!user) continue;

    const before = user.trustScore;
    user.completedTransactions = completed;
    user.cancelledTransactions = cancelled;

    let score;
    if (DRY_RUN) {
      const avg = Number(user.averageRenterRating) || 0;
      const quality = (avg / 5) * 70;
      const volume = Math.min(completed * 2, 20);
      const reliability = Math.max(0, 10 - cancelled * 2);
      score = Math.max(0, Math.min(100, Math.round(quality + volume + reliability)));
    } else {
      score = await user.calculateTrustScore();
    }

    const name = [stub.firstName, stub.lastName].filter(Boolean).join(' ') || String(userId);
    const changed = score !== before;
    if (changed) updated += 1;
    else unchanged += 1;

    console.log(
      `${changed ? '✓' : '·'} ${name.padEnd(24)} ` +
        `completed=${completed} cancelled=${cancelled} ` +
        `rating=${(Number(user.averageRenterRating) || 0).toFixed(1)} ` +
        `| trustScore ${before} → ${score}${changed ? '' : ' (unchanged)'}`,
    );
  }

  console.log(
    `\nDone. ${updated} score(s) ${DRY_RUN ? 'would change' : 'updated'}, ${unchanged} unchanged.`,
  );
}

run()
  .then(async () => {
    await disconnectMongo();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Trust-score backfill failed:', err.message);
    await disconnectMongo().catch(() => {});
    process.exit(1);
  });
