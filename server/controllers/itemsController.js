'use strict';

const asyncHandler = require('../utils/asyncHandler');
const itemsService = require('../services/itemsService');

exports.list = asyncHandler(async (req, res) => {
  const result = await itemsService.list(req.query);
  res.json(result);
});

// Public: turn a typed search address ("Tel Aviv") into a { lat, lng } centre,
// which the catalog then feeds back into GET /api/items?lat&lng for the radius search.
exports.geocode = asyncHandler(async (req, res) => {
  const result = await itemsService.geocode(req.query.q);
  res.json(result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await itemsService.getById(req.params.id);
  res.json({ item });
});

// Public: the confirmed (APPROVED) bookings for an item, as [{ startDate, endDate }]
// ranges. The booking calendar uses these to grey-out / disable unavailable days.
exports.bookedDates = asyncHandler(async (req, res) => {
  const bookedDates = await itemsService.bookedDates(req.params.id);
  res.json({ bookedDates });
});

exports.mine = asyncHandler(async (req, res) => {
  const items = await itemsService.listByOwner(req.user.id);
  res.json({ items });
});

exports.create = asyncHandler(async (req, res) => {
  const item = await itemsService.create(req.user.id, req.body);
  res.status(201).json({ item });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await itemsService.update(req.params.id, req.user, req.body);
  res.json({ item });
});

exports.remove = asyncHandler(async (req, res) => {
  await itemsService.remove(req.params.id, req.user);
  res.json({ message: 'Item deleted' });
});
