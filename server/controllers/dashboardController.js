'use strict';

const asyncHandler = require('../utils/asyncHandler');
const bookingsService = require('../services/bookingsService');


// GET /api/dashboard/my-rentals — bookings where renter === JWT user id (paged)
exports.myRentals = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await bookingsService.listMine(req.user.id, req.query);
  res.json({ bookings, pagination });
});

// GET /api/dashboard/incoming-requests — bookings on items owned by the JWT user (paged)
exports.incomingRequests = asyncHandler(async (req, res) => {
  const { bookings, pagination } = await bookingsService.listIncoming(req.user.id, req.query);
  res.json({ bookings, pagination });
});
