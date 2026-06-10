import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoanRequestModal from '../components/LoanRequestModal';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useCategories } from '../context/CategoriesContext';
import TgNavbar from '../components/TgNavbar';
import Avatar from '../components/Avatar';
import './ItemPage.css';

/* ── "ביחד" item detail page (ported from פריט.html) ── */

function getOwner(item) {
  const o = item.owner;
  if (o && (o.firstName || o.lastName)) return [o.firstName, o.lastName].filter(Boolean).join(' ');
  return 'משאיל פרטי';
}
function getPrice(item) {
  const d = Number(item.dailyRate);
  if (d > 0) return { main: `₪${d.toFixed(0)}`, unit: '/ ליום' };
  if (d === 0) return { main: 'חינם', unit: '' };
  return { main: 'לפי תיאום', unit: '' };
}

const Chevron = () =><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
const ArrowL  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>;

/* 5-star display — fills `value` rounded stars. */
function Stars({ value = 0 }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className="stars" aria-label={`${(Number(value) || 0).toFixed(1)} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={i <= v ? 'on' : ''} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
      ))}
    </span>
  );
}

function Accordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`acc-item${open ? ' open' : ''}`}>
      <button className="acc-head" type="button" onClick={() => setOpen(o => !o)}>
        {title}<Chevron />
      </button>
      <div className="acc-body"><div className="acc-body-inner">{children}</div></div>
    </div>
  );
}

export default function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labelOf } = useCategories();

  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [email, setEmail]     = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    apiFetch(`/items/${id}`)
      .then(d => { if (alive) setItem(d.item); })
      .catch(e => { if (alive) setError(e.message || 'הפריט לא נמצא'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  /* public reviews for this item (revealed double-blind reviews) */
  useEffect(() => {
    let alive = true;
    setReviewsLoading(true);
    apiFetch(`/items/${id}/reviews`)
      .then(d => { if (alive) setReviews(d.reviews || []); })
      .catch(() => { if (alive) setReviews([]); })
      .finally(() => { if (alive) setReviewsLoading(false); });
    return () => { alive = false; };
  }, [id]);

  /* drop the global fixed-navbar spacing — this page has its own topbar */
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  if (loading) return <div className="tg tg-white" dir="rtl"><div className="ip-state">טוען פריט…</div></div>;
  if (error || !item) return (
    <div className="tg tg-white" dir="rtl">
      <div className="ip-state">
        <p>{error || 'הפריט לא נמצא'}</p>
        <Link to="/search" className="btn btn-accent" style={{ marginTop: 18 }}>חזרה לכל הפריטים</Link>
      </div>
    </div>
  );

  const available = item.isActive !== false;
  const imgSrc  = item.imageUrl || null;
  const initial = item.title ? item.title[0] : '?';
  const owner   = getOwner(item);
  const price   = getPrice(item);

  // "בצעו הזמנה" opens the date picker → checkout → payment flow
  function startBooking() {
    if (!user) { navigate('/login'); return; }
    setShowModal(true);
  }

  return (
    <div className="tg tg-white" dir="rtl">

      <TgNavbar variant="page" active="items" />

      {/* ════════ DETAIL ════════ */}
      <main className="detail">
        <div className="wrap">
          <button className="back" onClick={() => navigate(-1)}><ArrowL /> חזרה לכל הפריטים</button>

          <div className="detail-title">
            <h1>{item.title}</h1>
            <div className="sub">{labelOf(item.category) || 'פריט להשאלה'} · מאת {owner}</div>
            {item.totalReviews > 0 && (
              <a href="#reviews" className="detail-rating">
                <Stars value={item.averageRating} />
                <strong>{Number(item.averageRating).toFixed(1)}</strong>
                <span>· {item.totalReviews} ביקורות</span>
              </a>
            )}
          </div>

          <div className="detail-grid">

            {/* ───── LEFT ───── */}
            <div className="detail-main">
              <div className="media-wrap">
                {imgSrc
                  ? <img className="media-photo" src={imgSrc} alt={item.title} />
                  : <div className="media-ph">{initial}</div>}
              </div>

              {/* impact trio */}
              <div className="impact3">
                <div className="imp blush">
                  <span className="imp-label">חוסך מקום</span>
                  <span className="imp-n">ארון שלם</span>
                  <span className="imp-desc">פחות אחסון מיותר בבית</span>
                  <span className="imp-ic"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 3v18M15 7h2" /></svg></span>
                </div>
                <div className="imp teal">
                  <span className="imp-label">חוסך כסף</span>
                  <span className="imp-n">מאות ₪</span>
                  <span className="imp-desc">במקום לקנות חדש</span>
                  <span className="imp-ic"><svg viewBox="0 0 24 24" fill="none" stroke="var(--block)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v1.5M12 16.5V18" /></svg></span>
                </div>
                <div className="imp butter">
                  <span className="imp-label">ידידותי לכדור</span>
                  <span className="imp-n">אפס בזבוז</span>
                  <span className="imp-desc">שיתוף במקום קנייה</span>
                  <span className="imp-ic"><svg viewBox="0 0 24 24" fill="none" stroke="#B8841A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" /></svg></span>
                </div>
              </div>

              {/* accordions */}
              <div className="acc">
                <Accordion title="תיאור הפריט" defaultOpen>
                  <p className="pad">{item.description || 'אין תיאור זמין כרגע לפריט זה.'}</p>
                </Accordion>
                <Accordion title="כדאי לדעת">
                  <p><strong>איסוף והחזרה:</strong> את הפריט אוספים ומחזירים ישירות מ{owner}. תאמו מראש מול המשאיל.</p>
                  <p><strong>תמחור:</strong> {price.main}{price.unit ? ` ${price.unit}` : ''} — הסכום הסופי מחושב לפי מספר ימי ההשאלה.</p>
                  <p><strong>שמירה על הפריט:</strong> אנא החזירו את הפריט נקי ובמצב תקין, מוכן למשאיל הבא.</p>
                </Accordion>
              </div>
            </div>

            {/* ───── RIGHT (sticky) ───── */}
            <aside className="aside">
              <div className="reserve">
                <div className="reserve-price">{price.main} {price.unit && <span>{price.unit}</span>}</div>
                {available
                  ? <button className="btn btn-accent" type="button" onClick={startBooking}>בצעו הזמנה</button>
                  : <button className="btn btn-accent" type="button" disabled>אזל כרגע</button>}
                <div className="reserve-stat">
                  {available
                    ? <><span className="reserve-pip" /> זמין להזמנה</>
                    : <><span className="reserve-pip off" /> לא זמין כרגע</>}
                </div>
              </div>

              <div className="aside-links">
                <Link className="aside-link" to="/#process">איך עובדות תקופות ההשאלה<ArrowL /></Link>
              </div>

              <div className="glance">
                <h3>במבט מהיר</h3>
                <div className="glance-item">
                  <Avatar user={item.owner} name={owner} size={24} />
                  מאת {owner}
                </div>
                <div className="glance-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>
                  {labelOf(item.category) || 'פריט להשאלה'}
                </div>
                <div className="glance-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v1.5M12 16.5V18" /></svg>
                  {price.main}{price.unit ? ` ${price.unit}` : ''}
                </div>
              </div>

              <div className="newsbox">
                <h4>{available ? 'עוד לא בטוחים?' : 'רוצים שנעדכן כשיתפנה?'}</h4>
                <p>הירשמו והישארו מעודכנים בפריטים חדשים, סניפים ומבצעים בקהילה.</p>
                <form className="nf" onSubmit={e => { e.preventDefault(); setEmailSent(true); }}>
                  <input type="email" placeholder="האימייל שלכם" aria-label="אימייל" value={email} onChange={e => setEmail(e.target.value)} disabled={emailSent} />
                  <button type="submit" aria-label="הרשמה" disabled={emailSent}>
                    {emailSent ? '✓' : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>}
                  </button>
                </form>
              </div>
            </aside>

          </div>
        </div>
      </main>

      {/* ════════ REVIEWS ════════ */}
      <section className="reviews-sec" id="reviews">
        <div className="wrap">
          <div className="reviews-head">
            <h2>ביקורות על הפריט</h2>
            {item.totalReviews > 0 && (
              <div className="reviews-avg">
                <Stars value={item.averageRating} />
                <strong>{Number(item.averageRating).toFixed(1)}</strong>
                <span>מתוך 5 · {item.totalReviews} ביקורות</span>
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <p className="reviews-empty">טוען ביקורות…</p>
          ) : reviews.length === 0 ? (
            <p className="reviews-empty">עדיין אין ביקורות על הפריט הזה. היו הראשונים לשאול ולדרג!</p>
          ) : (
            <div className="reviews-list">
              {reviews.map(r => {
                const who = r.reviewerId
                  ? [r.reviewerId.firstName, r.reviewerId.lastName].filter(Boolean).join(' ')
                  : 'משתמש';
                const when = r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                  : '';
                return (
                  <div className="review-card" key={r.id}>
                    <div className="review-card-top">
                      <Avatar user={r.reviewerId} name={who} size={40} className="review-card-av" />
                      <div className="review-card-meta">
                        <span className="review-card-nm">{who}</span>
                        {when && <span className="review-card-date">{when}</span>}
                      </div>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="review-card-text">{r.comment}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="mini-footer">
        <div className="wrap">
          <img className="mf-logo" src="/images/logo-light.png" alt="Click & Pick" />
          <span>© {new Date().getFullYear()} ביחד · שיתוף שכונתי</span>
        </div>
      </footer>

      {showModal && <LoanRequestModal item={item} onClose={() => setShowModal(false)} />}
    </div>
  );
}
