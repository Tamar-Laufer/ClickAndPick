'use strict';

const asyncHandler = require('../utils/asyncHandler');
const bookingsService = require('../services/bookingsService');


exports.myRentals = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await bookingsService.listMine(req.user.id, req.query);
  res.json({ bookings, pagination });
});

exports.incomingRequests = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await bookingsService.listIncoming(req.user.id, req.query);
  res.json({ bookings, pagination });
});
