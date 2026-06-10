'use strict';

const asyncHandler = require('../utils/asyncHandler');
const bookingsService = require('../services/bookingsService');

/*
 * SECURITY GOLDEN RULE
 * --------------------
 * The acting user id is ALWAYS taken from `req.user.id`, which `verifyToken`
 * sets from the *decoded JWT* — never from the request body, query or params.
 * A client cannot impersonate another user by sending a different userId,
 * which prevents IDOR / data-leak attacks.
 */

// GET /api/dashboard/my-rentals — bookings where renter === JWT user id
exports.myRentals = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.listMine(req.user.id);
  res.json({ bookings });
});

// GET /api/dashboard/incoming-requests — bookings on items owned by the JWT user
exports.incomingRequests = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.listIncoming(req.user.id);
  res.json({ bookings });
});
