'use strict';


const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { Booking } = require('../../database/models');

/* ───────────────────────────── config ───────────────────────────── */
const FROM = process.env.SMTP_FROM || 'Click&Pick <no-reply@clickandpick.app>';
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const BRAND = 'Click&Pick';
const ACCENT = '#EE5A2A';
const INK = '#1C1610';

/* Lazy singleton transporter. Returns null (warns once) when SMTP isn't set. */
let _transporter; // undefined = not yet resolved, null = unavailable
let _warned = false;
function getTransporter() {
  if (_transporter !== undefined) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!_warned) {
      logger.warn('SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — notification emails are disabled');
      _warned = true;
    }
    _transporter = null;
    return null;
  }
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    // 465 = implicit TLS; 587/25 = STARTTLS. Honour SMTP_SECURE if provided.
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

/* ───────────────────────────── helpers ───────────────────────────── */
/* Personal-area CTAs must funnel through the login screen first. A recipient may
   open the email on a shared device where another (or a stale) session is cached;
   routing via /login forces them to confirm/authenticate as themselves before any
   private page renders, and ?next= carries them on to the deep-linked destination
   after login. `path` is the in-app destination (its own query is preserved). */
const loginLink = (path) => `${CLIENT_URL}/login?next=${encodeURIComponent(path)}`;
const fullName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() : '') || 'שכן/ה';
const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMoney = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stripHtml = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Shared branded email shell (inline styles — required by mail clients).
 * `intro` and each row `value` may contain trusted HTML built here; raw user
 * data is passed through esc() at the call sites.
 */
function layout({ title, intro, rows = [], cta, footerNote }) {
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 0;color:#8A8174;font-size:14px;white-space:nowrap;text-align:right;">${esc(r.label)}</td>
        <td style="padding:9px 0;color:${INK};font-size:14px;font-weight:600;text-align:left;">${r.value}</td>
      </tr>`,
    )
    .join('');
  const ctaHtml = cta
    ? `<tr><td colspan="2" style="padding-top:26px;">
         <a href="${esc(cta.href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;">${esc(cta.label)}</a>
       </td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F7F0E2;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
    <div style="font-size:22px;font-weight:700;color:${ACCENT};margin-bottom:16px;text-align:right;">${BRAND}</div>
    <div style="background:#ffffff;border:1px solid #E2D9C6;padding:32px;text-align:right;">
      <h1 style="margin:0 0 10px;font-size:21px;color:${INK};">${esc(title)}</h1>
      <p style="margin:0 0 18px;color:#4F463C;font-size:15px;line-height:1.65;">${intro}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;">${rowsHtml}${ctaHtml}</table>
      ${footerNote ? `<p style="margin:24px 0 0;color:#8A8174;font-size:13px;line-height:1.6;">${footerNote}</p>` : ''}
    </div>
    <div style="text-align:center;color:#8A8174;font-size:12px;margin-top:18px;">© ${new Date().getFullYear()} ${BRAND} · השאלה שיתופית</div>
  </div>
</body></html>`;
}

/* Core send — NEVER throws. Returns true on success, false otherwise. */
async function sendMail({ to, subject, html, text }) {
  if (!to) {
    logger.warn(`Email skipped ("${subject}"): missing recipient`);
    return false;
  }
  const tx = getTransporter();
  if (!tx) return false;
  try {
    const info = await tx.sendMail({ from: FROM, to, subject, html, text: text || stripHtml(html) });
    logger.info(`Email sent: "${subject}" → ${to} (${info.messageId})`);
    return true;
  } catch (err) {
    logger.error(`Email failed: "${subject}" → ${to}: ${err.message}`);
    return false;
  }
}

/* ───────────────────────── Trigger 1: new request → owner ───────────────────────── */
async function notifyNewBookingRequest(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'item', select: 'title owner', populate: { path: 'owner', select: 'firstName lastName email' } })
      .populate('renter', 'firstName lastName averageRenterRating totalRenterReviews');
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
  } catch (err) {
    logger.error(`notifyNewBookingRequest(${bookingId}) failed: ${err.message}`);
    return false;
  }
}

/* ───────────────────── Trigger 2: status change → renter ───────────────────── */
async function notifyBookingStatusChange(bookingId, status) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'item', select: 'title owner', populate: { path: 'owner', select: 'firstName lastName phone address' } })
      .populate('renter', 'firstName lastName email');
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

    // REJECTED / CANCELLED by the owner
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
  } catch (err) {
    logger.error(`notifyBookingStatusChange(${bookingId}) failed: ${err.message}`);
    return false;
  }
}

/* ───────────────── Trigger 3: item returned / COMPLETED → both sides ─────────────────
   Fired the moment the owner marks the item returned. Sends TWO double-blind
   review invitations — one to the renter (rate the Item only), one to the
   owner (rate the Renter). Each link carries an explicit `as` side so the
   dashboard opens the correct review form regardless of which list the booking
   falls into. Returns true only if BOTH mails were sent. */
async function notifyBookingCompleted(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'item', select: 'title owner', populate: { path: 'owner', select: 'firstName lastName email' } })
      .populate('renter', 'firstName lastName email');
    if (!booking) return false;

    const owner = (booking.item && booking.item.owner) || {};
    const renter = booking.renter || {};
    const itemTitle = booking.item ? booking.item.title : 'הפריט';
    // Secure deep-links into the personal area's review panel. `as` pins the
    // side so the renter link always opens "rate the item" and the owner link
    // "rate the renter" — never guessed. The page still verifies the JWT + that
    // the user is the matching participant.
    const renterLink = loginLink(`/profile?review=${booking.id}&as=renter`);
    const ownerLink = loginLink(`/profile?review=${booking.id}&as=owner`);

    // A) → renter: rate the physical ITEM only (not the owner)
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

    // B) → owner: rate the renter's behaviour
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

    // Send both independently; don't let one missing address block the other.
    const [renterSent, ownerSent] = await Promise.all([
      renter.email
        ? sendMail({ to: renter.email, subject: `איך היה? דרגו את ההשאלה — ${itemTitle}`, html: renterHtml })
        : Promise.resolve(false),
      owner.email
        ? sendMail({ to: owner.email, subject: `הפריט חזר — דרגו את השוכר/ת — ${itemTitle}`, html: ownerHtml })
        : Promise.resolve(false),
    ]);

    if (!renter.email) logger.warn(`Completed email to renter skipped for ${bookingId}: email missing`);
    if (!owner.email) logger.warn(`Completed email to owner skipped for ${bookingId}: email missing`);

    return renterSent && ownerSent;
  } catch (err) {
    logger.error(`notifyBookingCompleted(${bookingId}) failed: ${err.message}`);
    return false;
  }
}

/* ──────────────────── Trigger 4: return reminder → renter ────────────────────
   Called by the cron job with a booking already populated with `renter`
   (firstName/lastName/email) and `item` (title). */
async function sendReturnReminder(booking) {
  try {
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
  } catch (err) {
    logger.error(`sendReturnReminder failed: ${err.message}`);
    return false;
  }
}

/* ──────────────────── Password reset → user ────────────────────
   Sent only when a forgot-password request matches a real account. Receives the
   RAW token (the hashed copy lives in the DB) and builds the frontend deep link
   here, so CLIENT_URL stays defined in one place. NEVER throws. */
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
  sendMail,
  notifyNewBookingRequest,
  notifyBookingStatusChange,
  notifyBookingCompleted,
  sendReturnReminder,
  sendPasswordReset,
};
