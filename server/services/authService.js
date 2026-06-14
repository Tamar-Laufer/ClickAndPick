'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../../database/models');
const emailService = require('./emailService');
const { ApiError } = require('../utils/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const GENERIC_RESET_MESSAGE = 'If an account with that email exists, a reset link has been sent.';

const hashResetToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

async function register({ firstName, lastName, email, password, phone }) {
  if (!firstName || firstName.trim().length < 2) throw new ApiError(400, 'First name must be at least 2 characters');
  if (!lastName || lastName.trim().length < 2) throw new ApiError(400, 'Last name must be at least 2 characters');
  if (!email || !EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');
  if (!password || password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

  const normalisedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalisedEmail })) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = new User({ firstName: firstName.trim(), lastName: lastName.trim(), email: normalisedEmail, phone });
  await user.setPassword(password);
  await user.save();

  return { user: user.toJSON(), token: signToken(user) };
}

async function login({ email, password }) {
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled');

  return { user: user.toJSON(), token: signToken(user) };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function updateProfile(userId, { firstName, lastName, phone, avatarUrl }) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  await user.save({ validateModifiedOnly: true });
  return user;
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password are required');
  if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');
  if (!(await user.comparePassword(currentPassword))) throw new ApiError(400, 'Current password is incorrect');

  await user.setPassword(newPassword);
  await user.save();
}

async function forgotPassword({ email }) {
  if (!email || !EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = hashResetToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save({ validateModifiedOnly: true });
    await emailService.sendPasswordReset({ to: user.email, name: user.firstName, token: rawToken });
  }

  return { message: GENERIC_RESET_MESSAGE };
}

async function resetPassword({ token, newPassword }) {
  if (!token) throw new ApiError(400, 'Invalid or expired token');
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const user = await User.findOne({
    resetPasswordToken: hashResetToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires +passwordHash');

  if (!user) throw new ApiError(400, 'Invalid or expired token');

  await user.setPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save({ validateModifiedOnly: true });

  return { message: 'Your password has been reset. You can now sign in.' };
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
