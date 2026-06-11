'use strict';

const { Feedback, User } = require('../../database/models');
const { ApiError } = require('../utils/errors');

/**
 * Public: anyone submits a question or a recommendation. We never trust an
 * incoming `isApprovedForHomepage` flag — new entries are always unapproved
 * and an admin curates them afterwards. Whitelisting the fields also blocks
 * mass-assignment.
 */
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

/**
 * Attach each entry's author avatar by matching its email to a registered
 * member, so both the homepage carousel and the admin inbox show the same
 * profile photo. Mutates and returns the given array of plain objects;
 * non-members get `avatarUrl: null`.
 */
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

/**
 * Admin: the full inbox, newest first.
 * Serialised via the schema's toJSON transform (`id` virtual, no `_id`) so the
 * admin UI's toggle — which posts `f.id` — works; a bare `.lean()` would drop
 * the virtual and send `undefined` → "Invalid _id".
 */
async function listAll() {
  const docs = await Feedback.find().sort({ createdAt: -1 });
  return attachAvatars(docs.map((d) => d.toJSON()));
}

/**
 * Admin: flip a recommendation's homepage visibility. Only recommendations
 * are eligible — questions are inbox-only and have nothing to show publicly.
 */
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

/**
 * Public: only approved recommendations, newest first — served straight to
 * the homepage carousel. Served by the { type, isApprovedForHomepage,
 * createdAt } index; `lean()` since it's read-only for display.
 */
async function listApproved() {
  const recs = await Feedback.find({ type: 'recommendation', isApprovedForHomepage: true })
    .sort({ createdAt: -1 })
    .lean();
  return attachAvatars(recs);
}

module.exports = { submit, listAll, toggleApprove, listApproved };
