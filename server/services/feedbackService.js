'use strict';

const { Feedback, User } = require('../../database/models');
const { ApiError } = require('../utils/errors');

async function submit({ name, email, type, message }) {
  if (!name || !name.trim()) throw new ApiError(400, 'שם חסר');
  if (!email || !email.trim()) throw new ApiError(400, 'אימייל חסר');
  if (!message || !message.trim()) throw new ApiError(400, 'תוכן ההודעה חסר');
  if (!Feedback.TYPES.includes(type)) throw new ApiError(400, 'סוג פנייה לא תקין');

  return Feedback.create({
    name: name.trim(),
    email: email.trim(),
    type,
    message: message.trim(),
    isApprovedForHomepage: false,
  });
}

async function attachAvatars(list) {
  const emails = [...new Set(list.map((r) => r.email).filter(Boolean))];
  if (!emails.length) return list;
  const users = await User.find({ email: { $in: emails } })
    .select('email avatarUrl')
    .lean();
  const avatarByEmail = new Map(users.map((u) => [u.email, u.avatarUrl]));
  list.forEach((r) => { r.avatarUrl = avatarByEmail.get(r.email) || null; });
  return list;
}

const INBOX_PAGE_SIZE = 8;
const INBOX_MAX_PAGE_SIZE = 50;

async function listAll({ page = 1, limit = INBOX_PAGE_SIZE, type } = {}) {
  const lim = Math.min(Math.max(Number(limit) || INBOX_PAGE_SIZE, 1), INBOX_MAX_PAGE_SIZE);
  const pg = Math.max(Number(page) || 1, 1);

  const filter = {};
  if (Feedback.TYPES.includes(type)) filter.type = type;

  const [docs, total, approvedCount] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim),
    Feedback.countDocuments(filter),
    Feedback.countDocuments({ type: 'recommendation', isApprovedForHomepage: true }),
  ]);

  const totalPages = Math.max(Math.ceil(total / lim), 1);
  return {
    feedback: await attachAvatars(docs.map((d) => d.toJSON())),
    approvedCount,
    pagination: { currentPage: pg, totalPages, totalItems: total, hasMore: pg < totalPages },
  };
}

async function toggleApprove(id) {
  const fb = await Feedback.findById(id);
  if (!fb) throw new ApiError(404, 'הפנייה לא נמצאה');
  if (fb.type !== 'recommendation') {
    throw new ApiError(400, 'רק המלצות ניתן להציג בדף הבית');
  }
  fb.isApprovedForHomepage = !fb.isApprovedForHomepage;
  await fb.save();
  return fb;
}

async function listApproved() {
  const recs = await Feedback.find({ type: 'recommendation', isApprovedForHomepage: true })
    .sort({ createdAt: -1 })
    .lean();
  return attachAvatars(recs);
}

module.exports = { submit, listAll, toggleApprove, listApproved };
