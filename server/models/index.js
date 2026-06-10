'use strict';

/**
 * Central model registry — import from here so Mongoose registers every
 * schema exactly once, e.g. `const { User, Item, Booking } = require('../models');`
 */
module.exports = {
  User: require('./User'),
  Item: require('./Item'),
  Booking: require('./Booking'),
  Review: require('./Review'),
  Category: require('./Category'),
  Feedback: require('./Feedback'),
};
