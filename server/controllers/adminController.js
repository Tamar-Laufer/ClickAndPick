'use strict';

const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

exports.listUsers = asyncHandler(async (_req, res) => {
  const users = await adminService.listUsers();
  res.json({ users });
});

exports.setUserActive = asyncHandler(async (req, res) => {
  const user = await adminService.setUserActive(req.params.id, req.body.isActive);
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

exports.toggleItemActive = asyncHandler(async (req, res) => {
  const item = await adminService.toggleItemActive(req.params.id);
  res.json({ item });
});
