import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { useCategories } from '../../../shared/context/CategoriesContext';
import useItemDetail from '../hooks/useItemDetail';
import { fullName, priceParts } from '../../../shared/utils/format';
import TgNavbar from '../../../shared/layout/TgNavbar';
import MiniFooter from '../../../shared/layout/MiniFooter';
import Avatar from '../../../shared/ui/Avatar';
import Loader from '../../../shared/ui/Loader';
import Stars from '../../../shared/ui/Stars';
import Accordion from '../../../shared/ui/Accordion';
import LoanRequestModal from '../components/LoanRequestModal';
import ItemReviews from '../components/ItemReviews';
import './ItemPage.css';


const ArrowL = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>;

export default function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labelOf } = useCategories();
  const { item, loading, error, reviews, reviewsLoading } = useItemDetail(id);

  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);


  if (loading) return <div className="tg tg-white" dir="rtl"><Loader className="ip-state" label="טוען פריט…" /></div>;
  if (error || !item) return (
    <div className="tg tg-white" dir="rtl">
      <div className="ip-state">
        <p>{error || 'הפריט לא נמצא'}</p>
        <Link to="/search" className="btn btn-accent">חזרה לכל הפריטים</Link>
      </div>
    </div>
  );

  const available = item.isActive !== false;
  const imgSrc  = item.imageUrl || null;
  const initial = item.title ? item.title[0] : '?';
  const owner   = fullName(item.owner, 'משאיל פרטי');
  const price   = priceParts(item);

  function startBooking() {
    if (!user) { navigate('/login'); return; }
    setShowModal(true);
  }

  return (
    <div className="tg tg-white" dir="rtl">

      <TgNavbar variant="page" active="items" />

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

            <div className="detail-main">
              <div className="media-wrap">
                {imgSrc
                  ? <img className="media-photo" src={imgSrc} alt={item.title} />
                  : <div className="media-ph">{initial}</div>}
              </div>

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

      <ItemReviews item={item} reviews={reviews} reviewsLoading={reviewsLoading} />

      <MiniFooter />

      {showModal && <LoanRequestModal item={item} onClose={() => setShowModal(false)} />}
    </div>
  );
}
