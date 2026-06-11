'use strict';

/**
 * מרשם מרכזי של המודלים — מייבאים מכאן כדי ש-Mongoose ירשום כל סכמה בדיוק פעם
 * אחת. דוגמה: `const { User, Item, Booking } = require('../../database/models');`
 */
module.exports = {
  User: require('./User'),
  Item: require('./Item'),
  Booking: require('./Booking'),
  Review: require('./Review'),
  Category: require('./Category'),
  Feedback: require('./Feedback'),
  Message: require('./Message'),
};
