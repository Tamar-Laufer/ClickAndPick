'use strict';

const { Booking } = require('../../../database/models');
const logger = require('../../utils/logger');
const { CLIENT_URL, loginLink, fullName, fmtDate, fmtMoney, esc } = require('./format');
const { BRAND, ACCENT, layout } = require('./layout');
const { sendMail } = require('./transport');

const safe = (name, fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    logger.error(`${name} failed: ${err.message}`);
    return false;
  }
};

const loadBooking = (id, { ownerSelect, renterSelect }) =>
  Booking.findById(id)
    .populate({ path: 'item', select: 'title owner', populate: { path: 'owner', select: ownerSelect } })
    .populate('renter', renterSelect);

const notifyNewBookingRequest = safe('notifyNewBookingRequest', async (bookingId) => {
  const booking = await loadBooking(bookingId, {
    ownerSelect: 'firstName lastName email',
    renterSelect: 'firstName lastName averageRenterRating totalRenterReviews',
  });
  if (!booking) return false;

  const owner = booking.item && booking.item.owner;
  const renter = booking.renter;
  if (!owner || !owner.email) {
    logger.warn(`New-booking email skipped for ${bookingId}: owner email missing`);
    return false;
  }

  const reviews = Number(renter && renter.totalRenterReviews) || 0;
  const ratingLine = reviews > 0
    ? `${(Number(renter.averageRenterRating) || 0).toFixed(1)} ★ · ${reviews} ביקורות`
    : 'שוכר/ת חדש/ה (ללא דירוג עדיין)';

  const html = layout({
    title: 'בקשת השאלה חדשה',
    intro: `שלום ${esc(fullName(owner))}, התקבלה בקשה לשאול פריט שלך. הנה הפרטים:`,
    rows: [
      { label: 'הפריט', value: esc(booking.item.title) },
      { label: 'מבקש/ת', value: esc(fullName(renter)) },
      { label: 'דירוג השוכר/ת', value: esc(ratingLine) },
      { label: 'תאריכים', value: `${esc(fmtDate(booking.startDate))} – ${esc(fmtDate(booking.endDate))}` },
      { label: 'סכום ההזמנה', value: esc(fmtMoney(booking.totalPrice)) },
    ],
    cta: { href: loginLink('/profile?tab=incoming'), label: 'לאישור או דחייה של הבקשה' },
    footerNote: 'הבקשה ממתינה לאישורך — אפשר לאשר או לדחות אותה מהאזור האישי שלך.',
  });

  return sendMail({ to: owner.email, subject: `בקשת השאלה חדשה — ${booking.item.title}`, html });
});

const notifyBookingStatusChange = safe('notifyBookingStatusChange', async (bookingId, status) => {
  const booking = await loadBooking(bookingId, {
    ownerSelect: 'firstName lastName phone address',
    renterSelect: 'firstName lastName email',
  });
  if (!booking) return false;

  const renter = booking.renter;
  if (!renter || !renter.email) {
    logger.warn(`Status email skipped for ${bookingId}: renter email missing`);
    return false;
  }
  const owner = (booking.item && booking.item.owner) || {};
  const itemTitle = booking.item ? booking.item.title : 'הפריט';

  if (status === 'APPROVED') {
    const html = layout({
      title: 'הבקשה אושרה!',
      intro: `שלום ${esc(fullName(renter))}, בקשת ההשאלה שלך אושרה — אפשר לתאם איסוף.`,
      rows: [
        { label: 'הפריט', value: esc(itemTitle) },
        { label: 'תאריכי השאלה', value: `${esc(fmtDate(booking.startDate))} – ${esc(fmtDate(booking.endDate))}` },
        { label: 'המשאיל/ה', value: esc(fullName(owner)) },
        { label: 'כתובת איסוף', value: esc(owner.address || 'תתואם ישירות מול המשאיל/ה') },
        { label: 'טלפון ליצירת קשר', value: owner.phone ? `<a href="tel:${esc(owner.phone)}" style="color:${ACCENT};text-decoration:none;">${esc(owner.phone)}</a>` : '—' },
      ],
      cta: { href: loginLink('/profile?tab=rentals'), label: 'לצפייה בהזמנה' },
      footerNote: 'מומלץ לתאם מראש את שעת האיסוף עם המשאיל/ה. השאלה מהנה!',
    });
    return sendMail({ to: renter.email, subject: `ההזמנה אושרה — ${itemTitle}`, html });
  }

  const html = layout({
    title: 'הבקשה לא אושרה',
    intro: `שלום ${esc(fullName(renter))}, לצערנו הבקשה לשאול את "${esc(itemTitle)}" לא אושרה הפעם.`,
    rows: [
      { label: 'הפריט', value: esc(itemTitle) },
      { label: 'התאריכים שביקשת', value: `${esc(fmtDate(booking.startDate))} – ${esc(fmtDate(booking.endDate))}` },
    ],
    cta: { href: `${CLIENT_URL}/search`, label: 'למצוא פריט דומה' },
    footerNote: 'לא בוצע כל חיוב — העיכבון על כרטיס האשראי שוחרר במלואו. יש עוד הרבה פריטים אצל השכנים!',
  });
  return sendMail({ to: renter.email, subject: `עדכון לגבי בקשת ההשאלה — ${itemTitle}`, html });
});

const notifyBookingCompleted = safe('notifyBookingCompleted', async (bookingId) => {
  const booking = await loadBooking(bookingId, {
    ownerSelect: 'firstName lastName email',
    renterSelect: 'firstName lastName email',
  });
  if (!booking) return false;

  const owner = (booking.item && booking.item.owner) || {};
  const renter = booking.renter || {};
  const itemTitle = booking.item ? booking.item.title : 'הפריט';
  const renterLink = loginLink(`/profile?review=${booking.id}&as=renter`);
  const ownerLink = loginLink(`/profile?review=${booking.id}&as=owner`);

  const renterHtml = layout({
    title: 'תודה שהחזרת את הפריט! ⭐',
    intro: `שלום ${esc(fullName(renter))}, ההשאלה הושלמה. נשמח אם תדרג/י את הפריט — הדירוג נחשף רק אחרי ששני הצדדים מדרגים.`,
    rows: [
      { label: 'הפריט', value: esc(itemTitle) },
      { label: 'תאריכי ההשאלה', value: `${esc(fmtDate(booking.startDate))} – ${esc(fmtDate(booking.endDate))}` },
    ],
    cta: { href: renterLink, label: 'לדירוג הפריט' },
    footerNote: 'הדירוג חסוי (Double-Blind) — אף צד לא רואה את דירוג הצד השני עד ששניכם מדרגים. חלון הדירוג פתוח ל-7 ימים.',
  });

  const ownerHtml = layout({
    title: 'הפריט חזר אליך! ⭐',
    intro: `שלום ${esc(fullName(owner))}, הפריט "${esc(itemTitle)}" סומן כהוחזר. נשמח אם תדרג/י את התנהלות השוכר/ת.`,
    rows: [
      { label: 'הפריט', value: esc(itemTitle) },
      { label: 'השוכר/ת', value: esc(fullName(renter)) },
      { label: 'תאריכי ההשאלה', value: `${esc(fmtDate(booking.startDate))} – ${esc(fmtDate(booking.endDate))}` },
    ],
    cta: { href: ownerLink, label: 'לדירוג השוכר/ת' },
    footerNote: 'הדירוג חסוי (Double-Blind) — נחשף רק אחרי ששני הצדדים מדרגים. חלון הדירוג פתוח ל-7 ימים.',
  });

  const [renterSent, ownerSent] = await Promise.all([
    renter.email
      ? sendMail({ to: renter.email, subject: `איך היה? דרגו את ההשאלה — ${itemTitle}`, html: renterHtml })
      : Promise.resolve(true),
    owner.email
      ? sendMail({ to: owner.email, subject: `הפריט חזר — דרגו את השוכר/ת — ${itemTitle}`, html: ownerHtml })
      : Promise.resolve(true),
  ]);

  if (!renter.email) logger.warn(`Completed email to renter skipped for ${bookingId}: email missing`);
  if (!owner.email) logger.warn(`Completed email to owner skipped for ${bookingId}: email missing`);

  return renterSent && ownerSent;
});

const sendReturnReminder = safe('sendReturnReminder', async (booking) => {
  if (!booking) return false;
  const renter = booking.renter;
  if (!renter || !renter.email) return false;
  const itemTitle = booking.item ? booking.item.title : 'הפריט';

  const html = layout({
    title: 'תזכורת: מחר מחזירים',
    intro: `שלום ${esc(fullName(renter))}, תזכורת ידידותית — תקופת ההשאלה מסתיימת מחר.`,
    rows: [
      { label: 'הפריט', value: esc(itemTitle) },
      { label: 'תאריך החזרה', value: esc(fmtDate(booking.endDate)) },
    ],
    cta: { href: loginLink('/profile?tab=rentals'), label: 'לצפייה בהשאלה' },
    footerNote: 'החזרה בזמן שומרת על דירוג טוב ועל קהילה אמינה. תודה רבה!',
  });
  return sendMail({ to: renter.email, subject: `תזכורת החזרה — ${itemTitle}`, html });
});

async function sendPasswordReset({ to, name, token }) {
  if (!to || !token) {
    logger.warn('Password-reset email skipped: missing recipient or token');
    return false;
  }
  const resetUrl = `${CLIENT_URL}/reset-password/${token}`;
  const html = layout({
    title: 'איפוס סיסמה',
    intro: `שלום ${esc(name || 'שכן/ה')}, קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך. לחצו על הכפתור כדי לבחור סיסמה חדשה:`,
    cta: { href: resetUrl, label: 'איפוס הסיסמה' },
    footerNote:
      'הקישור תקף לשעה אחת בלבד וניתן לשימוש פעם אחת. אם לא ביקשתם לאפס סיסמה — אפשר להתעלם מהמייל הזה, הסיסמה שלכם לא תשתנה.',
  });
  return sendMail({ to, subject: `${BRAND} · איפוס סיסמה`, html });
}

module.exports = {
  notifyNewBookingRequest,
  notifyBookingStatusChange,
  notifyBookingCompleted,
  sendReturnReminder,
  sendPasswordReset,
};
