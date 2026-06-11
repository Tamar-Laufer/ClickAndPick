'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../../database/models');
const emailService = require('./emailService');
const { ApiError } = require('../utils/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // שעה אחת
// מוחזר כמות שהוא בין אם האימייל קיים ובין אם לא — מונע מנייה (enumeration) של חשבונות.
const GENERIC_RESET_MESSAGE = 'If an account with that email exists, a reset link has been sent.';

// hash חד-כיווני של טוקן האיפוס הגולמי. שומרים אך ורק אותו, כך שהטוקן ב-DB חסר
// ערך לתוקף; הטוקן הגולמי חי אך ורק במייל של המשתמש.
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
  await user.setPassword(password); // לעולם לא מקבלים role בהרשמה עצמית → ברירת מחדל USER
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
  // מאמתים רק את השדות ששונו, כך שדאטה ישן ולא קשור (למשל defaultLocation ריק
  // וישן) לא יחסום עדכון פשוט של תמונה/פרטים.
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

/**
 * שכחתי סיסמה — מנפיק טוקן איפוס אם (ורק אם) האימייל תואם חשבון אמיתי ופעיל.
 * כדי לסכל מניית משתמשים, הפונקציה תמיד מחזירה את אותה הודעה גנרית ומבצעת את אותה
 * עבודה נצפית ללא קשר לקיום המשתמש; ההבדל (טוקן + מייל) קורה בשקט.
 */
async function forgotPassword({ email }) {
  if (!email || !EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // פועלים רק עבור חשבונות אמיתיים ומאופשרים — אך לעולם לא מאותתים זאת לקורא.
  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = hashResetToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    // מאמתים אך ורק את השדות שזה עתה קבענו — אימות מלא מחדש היה נכשל על דאטה
    // ישן ולא קשור במסמך (למשל defaultLocation ישן/ריק).
    await user.save({ validateModifiedOnly: true });

    // שולחים את המייל (השירות לעולם לא זורק; הוא רושם ללוג בכישלון). מחכים (await)
    // כדי ש-SMTP שגוי יופיע בלוגים, אבל התשובה גנרית כך או כך.
    await emailService.sendPasswordReset({ to: user.email, name: user.firstName, token: rawToken });
  }

  return { message: GENERIC_RESET_MESSAGE };
}

/**
 * איפוס סיסמה — מימוש טוקן גולמי מקישור המייל. הטוקן הנכנס עובר hash ב-SHA-256
 * ומותאם מול ההאש השמור וגם מול תוקף שלא פג, בשאילתה אחת (כך שטוקן שפג נקרא פשוט
 * כ"לא נמצא"). בהצלחה הסיסמה החדשה עוברת hash ב-bcrypt דרך setPassword() והטוקן
 * מנוקה, מה שהופך אותו לחד-פעמי בהחלט.
 */
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
  // מבטלים את הטוקן כדי שלא ניתן יהיה לעשות בו שימוש חוזר.
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  // מאמתים רק את השדות ששונו (סיסמה + טוקן מנוקה), לא דאטה ישן כמו
  // defaultLocation שהיה נכשל באימות מחדש.
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
