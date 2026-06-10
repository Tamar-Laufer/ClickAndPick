import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import './ReviewModal.css';

/* ReviewModal — one side of the double-blind two-way review.
   role 'renter' → rate the item;  role 'owner' → rate the renter. */

export default function ReviewModal({ booking, role, onClose, onSubmitted }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover]   = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [result, setResult] = useState(null); // { revealed }

  const item = booking.item || {};
  const isRenter = role === 'renter';
  const title = isRenter ? 'דרגו את הפריט' : 'דרגו את השוכר';
  const subject = isRenter
    ? (item.title || 'הפריט')
    : (booking.renter ? [booking.renter.firstName, booking.renter.lastName].filter(Boolean).join(' ') : 'השוכר');

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating < 1) { setError('בחרו דירוג בין 1 ל-5 כוכבים'); return; }
    setError(''); setLoading(true);
    try {
      const data = await apiFetch(`/bookings/${booking.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      }, token);
      setResult(data); // { review, revealed }
      onSubmitted?.(booking.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-box" dir="rtl" onClick={e => e.stopPropagation()}>
        <button className="rv-close" onClick={onClose} aria-label="סגירה">✕</button>

        {result ? (
          <div className="rv-done">
            <div className="rv-done-ic">✓</div>
            <h3>תודה על הביקורת!</h3>
            <p>{result.revealed
              ? 'שני הצדדים דירגו — הביקורות פורסמו עכשיו.'
              : 'הביקורת נשמרה ותתפרסם ברגע שגם הצד השני ידרג (או בתום 7 ימים).'}</p>
            <button className="rv-submit" onClick={onClose}>סגירה</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="rv-title">{title}</h3>
            <p className="rv-subject">{subject}</p>

            {/* interactive 5-star rating */}
            <div className="rv-stars" role="radiogroup" aria-label="דירוג">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  className={`rv-star${i <= (hover || rating) ? ' on' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(i)}
                  aria-label={`${i} כוכבים`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
                </button>
              ))}
            </div>

            <textarea
              className="rv-text"
              rows={4}
              placeholder={isRenter ? 'איך היה הפריט? מצב, התאמה לתיאור…' : 'איך הייתה ההתנהלות מול השוכר?'}
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={1000}
            />

            {error && <p className="rv-error">{error}</p>}

            <button type="submit" className="rv-submit" disabled={loading}>
              {loading ? 'שולח…' : 'שליחת ביקורת'}
            </button>
            <p className="rv-note">הביקורות עיוורות — הן נחשפות רק כששני הצדדים דירגו, כדי למנוע ביקורות נקמה.</p>
          </form>
        )}
      </div>
    </div>
  );
}
