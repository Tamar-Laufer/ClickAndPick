'use strict';

const { sendMail } = require('./email/transport');
const {
  notifyNewBookingRequest,
  notifyBookingStatusChange,
  notifyBookingCompleted,
  sendReturnReminder,
  sendPasswordReset,
} = require('./email/notifications');

module.exports = {
  sendMail,
  notifyNewBookingRequest,
  notifyBookingStatusChange,
  notifyBookingCompleted,
  sendReturnReminder,
  sendPasswordReset,
};
