'use strict';

const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit, q } = req.query;
  const result = await adminService.listUsers({ page, limit, q });
  res.json(result);
});

exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await adminService.toggleUserActive(req.params.id);
  res.json({ user });
});

exports.setUserRole = asyncHandler(async (req, res) => {
  const user = await adminService.setUserRole(req.params.id, req.body.role);
  res.json({ user });
});

exports.stats = asyncHandler(async (_req, res) => {
  const stats = await adminService.stats();
  res.json({ stats });
});

exports.listItems = asyncHandler(async (req, res) => {
  const { page, limit, q } = req.query;
  const result = await adminService.listItems({ page, limit, q });
  res.json(result);
});

exports.toggleItemActive = asyncHandler(async (req, res) => {
  const item = await adminService.toggleItemActive(req.params.id);
  res.json({ item });
});
