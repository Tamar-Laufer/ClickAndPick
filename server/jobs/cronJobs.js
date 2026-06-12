'use strict';

const cron = require('node-cron');
const { Booking } = require('../../database/models');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const TZ = process.env.CRON_TZ || 'Asia/Jerusalem';
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; 

async function runReturnReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_MS);
  try {
    const due = await Booking.find({
      status: 'APPROVED',
      returnReminderSentAt: null,
      endDate: { $gte: now, $lte: horizon },
    })
      .populate('renter', 'firstName lastName email')
      .populate('item', 'title');

    if (due.length === 0) return { total: 0, sent: 0 };

    let sent = 0;
    for (const booking of due) {
      const ok = await emailService.sendReturnReminder(booking);
      if (ok) {
        booking.returnReminderSentAt = new Date();
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

function startCronJobs() {
  cron.schedule('0 * * * *', () => { runReturnReminders(); }, { timezone: TZ });
  logger.info(`Cron scheduled: return reminders hourly (24h-ahead window, ${TZ})`);
}

module.exports = { startCronJobs, runReturnReminders };
