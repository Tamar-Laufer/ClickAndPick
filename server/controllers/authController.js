'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

exports.register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({ user, token });
});

exports.login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.json({ user, token });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({ user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  res.json({ user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  res.json({ message: 'Password updated' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  res.json(result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    token: req.params.token,
    newPassword: req.body.newPassword,
  });
  res.json(result);
});
