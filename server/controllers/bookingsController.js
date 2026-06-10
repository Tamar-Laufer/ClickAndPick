'use strict';

const asyncHandler = require('../utils/asyncHandler');
const bookingsService = require('../services/bookingsService');

exports.create = asyncHandler(async (req, res) => {
  const booking = await bookingsService.create(req.user.id, req.body);
  res.status(201).json({ booking });
});

exports.mine = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.listMine(req.user.id);
  res.json({ bookings });
});

exports.incoming = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.listIncoming(req.user.id);
  res.json({ bookings });
});

exports.getOne = asyncHandler(async (req, res) => {
  const booking = await bookingsService.getById(req.params.id, req.user);
  res.json({ booking });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const booking = await bookingsService.updateStatus(req.params.id, req.user, req.body.status);
  res.json({ booking });
});
