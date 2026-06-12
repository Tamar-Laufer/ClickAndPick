'use strict';

const { Booking, Item, User } = require('../../database/models');
const { ApiError } = require('../utils/errors');
const emailService = require('./emailService');

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ACTIVE_STATUSES = ['PENDING', 'APPROVED'];

// Dashboard lists are loaded a page at a time (the profile renders ~6 cards per
// chunk and asks for more on demand) — never the whole history at once.
const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 50;

/** Clamp page/limit query input and shape the meta the client paginators read. */
function paginate({ page, limit } = {}) {
  const lim = Math.min(Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const pg = Math.max(Number(page) || 1, 1);
  return { lim, pg };
}
function paginationMeta(pg, lim, total) {
  const totalPages = Math.max(Math.ceil(total / lim), 1);
  return { currentPage: pg, totalPages, totalItems: total, hasMore: pg < totalPages };
}

/** עיגול סכום כסף ל-2 ספרות אחרי הנקודה (מונע סחף float כמו 4.500000001). */
const money = (n) => Math.round(n * 100) / 100;

/** יצירת הזמנה: מאמת תאריכים, זמינות, בעלוּת ומחשב מחיר. */
async function create(renterId, { item: itemId, startDate, endDate }) {
  if (!itemId || !startDate || !endDate) throw new ApiError(400, 'item, startDate and endDate are required');

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'Invalid dates');
  if (end <= start) throw new ApiError(400, 'End date must be after start date');

  const item = await Item.findById(itemId);
  if (!item || !item.isActive) throw new ApiError(404, 'Item is not available');
  if (String(item.owner) === String(renterId)) throw new ApiError(400, 'You cannot book your own item');

  // חפיפה עם כל הזמנה שעדיין פעילה עבור אותו פריט
  const clash = await Booking.exists({
    item: itemId,
    status: { $in: ACTIVE_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
  });
  if (clash) throw new ApiError(409, 'The item is already booked for these dates');

  const days = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
  const totalPrice = money(days * item.dailyRate);

  // פיצול העמלה בצד השרת. השוכר משלם totalPrice; הפלטפורמה שומרת PLATFORM_FEE_RATE
  // ממנו והבעלים מקבל את היתרה. ownerEarnings נגזר בחיסור (לא אחוז שני), כך
  // ש-fee + earnings === totalPrice בדיוק. סכומים מהלקוח מתעלמים — אלה מקור האמת.
  const platformFee = money(totalPrice * Booking.PLATFORM_FEE_RATE);
  const ownerEarnings = money(totalPrice - platformFee);

  const booking = await Booking.create({
    item: itemId,
    renter: renterId,
    startDate: start,
    endDate: end,
    totalPrice,
    platformFee,
    ownerEarnings,
  });

  // טריגר 1 — מייל לבעלים על בקשת ה-PENDING החדשה.
  // Fire-and-forget: מטפל בשגיאות בעצמו ולעולם לא חוסם/שובר את ההזמנה.
  emailService.notifyNewBookingRequest(booking.id);

  return booking;
}

/** ההזמנות שהמשתמש ביצע (כשוכר) — עמוד אחד בכל פעם, החדשות קודם. */
async function listMine(renterId, opts) {
  const { lim, pg } = paginate(opts);
  const filter = { renter: renterId };
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate({
        path: 'item',
        select: 'title imageUrl dailyRate category owner',
        populate: { path: 'owner', select: 'firstName lastName avatarUrl' },
      })
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim),
    Booking.countDocuments(filter),
  ]);
  return { bookings, pagination: paginationMeta(pg, lim, total) };
}

/** הזמנות על פריטים שבבעלות המשתמש (בקשות נכנסות) — עמוד אחד בכל פעם. */
async function listIncoming(ownerId, opts) {
  const { lim, pg } = paginate(opts);
  const owned = await Item.find({ owner: ownerId }).select('_id').lean();
  const filter = { item: { $in: owned.map((i) => i._id) } };
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('item', 'title imageUrl')
      .populate('renter', 'firstName lastName email avatarUrl')
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim),
    Booking.countDocuments(filter),
  ]);
  return { bookings, pagination: paginationMeta(pg, lim, total) };
}

async function getById(id, user) {
  const booking = await Booking.findById(id)
    .populate('item')
    .populate('renter', 'firstName lastName email avatarUrl');
  if (!booking) throw new ApiError(404, 'Booking not found');
  ensureParticipant(booking, user);
  return booking;
}

/**
 * מעבר סטטוס של הזמנה.
 *  - בעלים/אדמין רשאים לקבוע APPROVED, COMPLETED או CANCELLED.
 *  - השוכר רשאי רק לבטל (CANCEL) הזמנה ממתינה/מאושרת שלו.
 */
async function updateStatus(id, user, status) {
  const booking = await Booking.findById(id).populate('item', 'owner');
  if (!booking) throw new ApiError(404, 'Booking not found');

  const isRenter = String(booking.renter) === String(user.id);
  const isOwner = String(booking.item.owner) === String(user.id);
  const isAdmin = user.role === 'ADMIN';
  if (!isRenter && !isOwner && !isAdmin) throw new ApiError(403, 'Not allowed');

  const allowed = isOwner || isAdmin ? ['APPROVED', 'COMPLETED', 'CANCELLED'] : ['CANCELLED'];
  if (!allowed.includes(status)) throw new ApiError(403, `You cannot set status to ${status}`);

  // לוכדים את הסטטוס הקודם לפני השינוי — דרוש כדי לזהות מעבר ראשון ל-COMPLETED
  // וביטול של הזמנה שכבר הייתה APPROVED.
  const prevStatus = booking.status;
  const firstCompletion = status === 'COMPLETED' && prevStatus !== 'COMPLETED';
  const cancelledAfterApproval = status === 'CANCELLED' && prevStatus === 'APPROVED';

  booking.status = status;
  if (status === 'COMPLETED' && !booking.completedAt) booking.completedAt = new Date();
  await booking.save();

  if (firstCompletion) {
    // טריגר 3 — "הפריט הוחזר": מייל לשני הצדדים עם הזמנות לכתוב ביקורת.
    emailService.notifyBookingCompleted(booking.id);
    // רכיב "ניסיון": סופרים את ההשכרה שהושלמה לטובת ציון האמון של השוכר.
    await bumpRenterReputation(booking.renter, { completed: 1 });
  } else if (cancelledAfterApproval) {
    // רכיב "אמינות": ביטול אחרי אישור פוגע בציון האמון של השוכר.
    await bumpRenterReputation(booking.renter, { cancelled: 1 });
  }

  // טריגר 2 — מודיעים לשוכר כשהבעלים/אדמין מאשר או דוחה.
  // (מדלגים כשהשוכר מבטל את ההזמנה שלו עצמו — הוא כבר יודע.)
  if ((isOwner || isAdmin) && (status === 'APPROVED' || status === 'CANCELLED')) {
    emailService.notifyBookingStatusChange(booking.id, status);
  }

  return booking;
}

/**
 * מגדיל אטומית את מוני העסקאות של השוכר, ואז מרענן את ציון האמון מהערכים החדשים.
 * המונים מוגדלים עם $inc (בטוח למרוץ); הציון מחושב מחדש על מסמך טרי. מאמץ מיטבי —
 * כישלון כאן לעולם לא ישבור את מעבר הסטטוס, ולכן הוא רושם ללוג ובולע את השגיאה.
 */
async function bumpRenterReputation(renterId, { completed = 0, cancelled = 0 }) {
  try {
    const inc = {};
    if (completed) inc.completedTransactions = completed;
    if (cancelled) inc.cancelledTransactions = cancelled;
    if (!Object.keys(inc).length) return;

    const user = await User.findByIdAndUpdate(renterId, { $inc: inc }, { new: true });
    if (user) await user.calculateTrustScore(); // חישוב מחדש + שמירת trustScore
  } catch (err) {
    // eslint-disable-next-line global-require
    require('../utils/logger').error(`bumpRenterReputation(${renterId}) failed: ${err.message}`);
  }
}

function ensureParticipant(booking, user) {
  const renterId = String(booking.renter._id || booking.renter);
  const ownerId = String(booking.item.owner);
  if (renterId !== String(user.id) && ownerId !== String(user.id) && user.role !== 'ADMIN') {
    throw new ApiError(403, 'Not allowed');
  }
}

module.exports = { create, listMine, listIncoming, getById, updateStatus };
