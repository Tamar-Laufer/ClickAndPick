'use strict';

/**
 * cronJobs — scheduled background tasks.
 *
 * Return reminder: nudges renters whose rental is due back within the next 24h.
 * Runs HOURLY (not once a day) and marks each booking as reminded, so a rental
 * is reminded exactly once ~a day before its endDate — regardless of when it was
 * booked or approved. (A single daily 08:00 run misses bookings created later
 * that same day for next-day return, which is exactly the gap we hit.)
 *
 * Wired up once from index.js (after the DB connects) via startCronJobs().
 * runReturnReminders() is exported too, so it can be invoked manually / in tests
 * without waiting for the next hourly tick.
 */

const cron = require('node-cron');
const { Booking } = require('../models');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const TZ = process.env.CRON_TZ || 'Asia/Jerusalem';
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // remind within 24h before the return

/**
 * Email a return reminder to every renter whose rental comes due in the next 24h
 * and hasn't been reminded yet, then stamp `returnReminderSentAt` so it won't
 * fire again.
 *
 * NOTE on status: the Booking enum is PENDING/APPROVED/COMPLETED/CANCELLED —
 * there is no 'ACTIVE'. An *active* rental is an APPROVED booking within its
 * date range, so "active + due soon" ⇒ status APPROVED with endDate in the
 * [now, now+24h] window.
 *
 * Resilient: a single email failure can't abort the batch (sendReturnReminder
 * never throws), and any query-level failure is caught and logged.
 */
async function runReturnReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_MS);
  try {
    const due = await Booking.find({
      status: 'APPROVED',
      returnReminderSentAt: null, // also matches docs missing the field (older bookings)
      endDate: { $gte: now, $lte: horizon },
    })
      .populate('renter', 'firstName lastName email')
      .populate('item', 'title');

    if (due.length === 0) return { total: 0, sent: 0 };

    let sent = 0;
    for (const booking of due) {
      // eslint-disable-next-line no-await-in-loop -- sequential keeps SMTP load gentle
      const ok = await emailService.sendReturnReminder(booking);
      if (ok) {
        booking.returnReminderSentAt = new Date();
        // eslint-disable-next-line no-await-in-loop
        await booking.save();
        sent += 1;
      }
    }
    logger.info(`Return-reminder job: ${sent}/${due.length} reminder(s) sent`);
    return { total: due.length, sent };
  } catch (err) {
    logger.error(`Return-reminder job failed: ${err.message}`);
    return { total: 0, sent: 0, error: err.message };
  }
}

/** Register all scheduled jobs. Call once, after the DB connection is ready. */
function startCronJobs() {
  // “0 * * * *” → top of every hour, TZ-aware
  cron.schedule('0 * * * *', () => { runReturnReminders(); }, { timezone: TZ });
  logger.info(`Cron scheduled: return reminders hourly (24h-ahead window, ${TZ})`);
}

module.exports = { startCronJobs, runReturnReminders };
