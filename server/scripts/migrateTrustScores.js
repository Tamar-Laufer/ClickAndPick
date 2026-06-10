'use strict';

/**
 * One-off backfill: compute an accurate Trust Score for every EXISTING user.
 *
 * The Trust Score feature ships with sensible defaults (trustScore 50,
 * completedTransactions 0, cancelledTransactions 0), but users and bookings
 * created by the previous version of the app never had those counters
 * maintained. This script reconstructs them from historical data and writes a
 * correct score, so the platform doesn't show every veteran user a flat 50.
 *
 * For each user it:
 *   1. Counts COMPLETED bookings where they were the renter → completedTransactions.
 *   2. Counts CANCELLED bookings where they were the renter → cancelledTransactions.
 *   3. Re-derives averageRenterRating / totalRenterReviews from their PUBLIC
 *      User-target reviews (Review.recalculate) — the Quality term reads this.
 *   4. Runs the real calculateTrustScore() instance method and persists it.
 *
 * It reuses the exact same algorithm and connection helpers as the live app, so
 * the backfilled scores are identical to what new activity would produce.
 *
 * Idempotent: counters are SET from counts (not incremented), so re-running
 * yields the same result. Safe to run more than once.
 *
 *   node scripts/migrateTrustScores.js            # apply
 *   node scripts/migrateTrustScores.js --dry-run  # report only, write nothing
 *
 * ── Known limitation (cancelledTransactions) ──────────────────────────────
 * The new field's forward semantics are "cancellations the renter made AFTER
 * approval." Historical bookings only store their CURRENT status, not the
 * transition history, so we cannot tell a post-approval cancel from one that
 * was declined while still PENDING. This script counts ALL of a renter's
 * CANCELLED bookings, which is the conservative (slightly harsher) choice. If
 * you'd rather give the benefit of the doubt for legacy data, pass
 * --ignore-cancellations to backfill those as 0; going forward the live counter
 * stays accurate either way.
 */

require('dotenv').config();
const { connectMongo, disconnectMongo } = require('../config/db');
const { User, Booking, Review } = require('../models');

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

    // 1–2) historical transaction counts for this renter
    const [completed, cancelled] = await Promise.all([
      Booking.countDocuments({ renter: userId, status: 'COMPLETED' }),
      IGNORE_CANCELLATIONS
        ? Promise.resolve(0)
        : Booking.countDocuments({ renter: userId, status: 'CANCELLED' }),
    ]);

    // 3) refresh averageRenterRating / totalRenterReviews from PUBLIC reviews,
    //    so the Quality term scores off accurate, currently-visible ratings.
    //    (Skipped on a dry run — it would mutate the DB.)
    if (!DRY_RUN) await Review.recalculate('User', userId);

    // Load AFTER recalculate so averageRenterRating is fresh in memory.
    const user = await User.findById(userId);
    if (!user) continue;

    const before = user.trustScore;
    user.completedTransactions = completed;
    user.cancelledTransactions = cancelled;

    // 4) compute with the real algorithm. On a dry run we replicate the math
    //    without saving so we can preview the delta.
    let score;
    if (DRY_RUN) {
      const avg = Number(user.averageRenterRating) || 0;
      const quality = (avg / 5) * 70;
      const volume = Math.min(completed * 2, 20);
      const reliability = Math.max(0, 10 - cancelled * 2);
      score = Math.max(0, Math.min(100, Math.round(quality + volume + reliability)));
    } else {
      score = await user.calculateTrustScore(); // persists counters + trustScore
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
