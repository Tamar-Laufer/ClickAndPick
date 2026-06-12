'use strict';

const asyncHandler = require('../utils/asyncHandler');
const itemsService = require('../services/itemsService');

exports.list = asyncHandler(async (req, res) => {
  const result = await itemsService.list(req.query);
  res.json(result);
});

// ציבורי: הופך כתובת חיפוש שהוקלדה ("תל אביב") למרכז { lat, lng }, שהקטלוג מזין
// בחזרה ל-GET /api/items?lat&lng עבור חיפוש הרדיוס.
exports.geocode = asyncHandler(async (req, res) => {
  const result = await itemsService.geocode(req.query.q);
  res.json(result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await itemsService.getById(req.params.id);
  res.json({ item });
});

// ציבורי: ההזמנות המאושרות (APPROVED) של פריט, כטווחי [{ startDate, endDate }].
// לוח ההזמנות משתמש בהם כדי לאפור / להשבית ימים לא זמינים.
exports.bookedDates = asyncHandler(async (req, res) => {
  const bookedDates = await itemsService.bookedDates(req.params.id);
  res.json({ bookedDates });
});

exports.mine = asyncHandler(async (req, res) => {
  const { items, pagination } = await itemsService.listByOwner(req.user.id, req.query);
  res.json({ items, pagination });
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
