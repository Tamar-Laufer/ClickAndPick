import { Link } from 'react-router-dom';
import Avatar from '../../../shared/ui/Avatar';
import { fullName } from '../../../shared/utils/format';
import './BookingCard.css';


const STATUS = {
  PENDING: { label: 'ממתין לאישור', cls: 'pending' },
  APPROVED: { label: 'מאושר', cls: 'approved' },
  ACTIVE: { label: 'בהשאלה כעת', cls: 'active' },
  COMPLETED: { label: 'הושלם', cls: 'completed' },
  CANCELLED: { label: 'בוטל', cls: 'cancelled' },
};

const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

function displayStatus(b) {
  if (b.status === 'APPROVED') {
    const now = new Date();
    if (new Date(b.startDate) <= now && now <= new Date(b.endDate)) return 'ACTIVE';
  }
  return b.status;
}
const shekel = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
export default function BookingCard({ booking, role, onAction, onReview, onOpenChat, busy }) {
  const item = booking.item || {};
  const itemMissing = !booking.item;
  const title = item.title || (itemMissing ? 'פריט שהוסר' : 'פריט');
  const view = STATUS[displayStatus(booking)] || STATUS.PENDING;
  const platformFee = booking.platformFee ?? +(booking.totalPrice * 0.1).toFixed(2);
  const ownerEarnings = booking.ownerEarnings ?? +(booking.totalPrice - platformFee).toFixed(2);
  const counterUser = role === 'renter' ? item.owner : booking.renter;
  const counterLabel = role === 'renter'
    ? (item.owner ? `מהשכן/ה ${fullName(item.owner)}` : null)
    : (booking.renter ? `מבקש/ת: ${fullName(booking.renter)}` : null);
  const actions = [];
  if (role === 'owner') {
    if (booking.status === 'PENDING') {
      actions.push({ label: 'אישור', status: 'APPROVED', kind: 'accent' });
      actions.push({ label: 'דחייה', status: 'CANCELLED', kind: 'line' });
    } else if (booking.status === 'APPROVED') {
      actions.push({ label: 'סמן כהוחזר', status: 'COMPLETED', kind: 'accent' });
      actions.push({ label: 'ביטול', status: 'CANCELLED', kind: 'line' });
    }
  } else if (booking.status === 'PENDING' || booking.status === 'APPROVED') {
    actions.push({ label: 'ביטול ההזמנה', status: 'CANCELLED', kind: 'line' });
  }

  const img = item.imageUrl || null;

  return (
    <article className="bk">
      <Link className="bk-media" to={item.id ? `/item/${item.id}` : '#'}>
        <div className={`bk-ph${itemMissing ? ' bk-ph-missing' : ''}`}>
          {item.title ? item.title[0] : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          )}
        </div>
        {img && <img src={img} alt={title} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      </Link>

      <div className="bk-body">
        <div className="bk-top">
          <span className="bk-title">{title}</span>
          <span className={`bk-status ${view.cls}`}>{view.label}</span>
        </div>

        {counterLabel && (
          <div className="bk-meta">
            <Avatar user={counterUser} size={22} className="bk-meta-av" />
            <span>{counterLabel}</span>
          </div>
        )}

        <div className="bk-dates">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="1" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          {fmtDate(booking.startDate)} – {fmtDate(booking.endDate)}
        </div>

        {role === 'owner' && (
          <div className="bk-payout">
            <div className="bk-payout-row">
              <span>השוכר משלם</span>
              <span>{shekel(booking.totalPrice)}</span>
            </div>
            <div className="bk-payout-row bk-payout-fee">
              <span>עמלת הפלטפורמה (10%)</span>
              <span>−{shekel(platformFee)}</span>
            </div>
            <div className="bk-payout-row bk-payout-net">
              <span>הרווח שלכם</span>
              <span>{shekel(ownerEarnings)}</span>
            </div>
          </div>
        )}

        <div className="bk-foot">
          <span className="bk-price">{role === 'owner' ? '' : `₪${booking.totalPrice}`}</span>
          {(actions.length > 0 || booking.status === 'APPROVED' || (booking.status === 'COMPLETED' && onReview)) && (
            <div className="bk-actions">
              {actions.map(a => (
                <button
                  key={a.status}
                  className={`bk-btn ${a.kind}`}
                  disabled={busy}
                  onClick={() => onAction(booking.id, a.status)}
                >
                  {busy ? '…' : a.label}
                </button>
              ))}
              {booking.status === 'APPROVED' && counterUser && onOpenChat && (
                <button
                  className="bk-btn line bk-btn-chat"
                  onClick={() => onOpenChat(counterUser.id, fullName(counterUser))}
                  aria-label="פתח צ'ט"
                >
                  <img src="/images/chat.png" alt="צ'ט" className="bk-chat-icon" />
                </button>
              )}
              {booking.status === 'COMPLETED' && onReview && (
                <button className="bk-btn accent" onClick={() => onReview(booking)}>השאירו ביקורת</button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
