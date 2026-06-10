import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useCategories } from '../context/CategoriesContext';
import { useFullBleed } from '../hooks/useFullBleed';
import TgNavbar from '../components/layout/TgNavbar';
import MiniFooter from '../components/layout/MiniFooter';
import './CheckoutPage.css';

/* ── Checkout (ported from תשלום.html) ──────────────────────────────────────
   Reached from the booking date-picker via "המשך לתשלום". Carries the chosen
   item + dates in router state. The booking itself is created on "שלמו" (the
   mock payment hold) — POST /bookings — and then we move to the success page.
   The personal/card fields are a faithful port of the prototype; payment isn't
   wired to a real processor, so they're collected but not transmitted. */

const BRANCHES = [
  'מרכז העיר · רחוב הרצל 12 (0.6 ק״מ)',
  'שכונת הצפון · כיכר העצמאות 4 (1.2 ק״מ)',
  'דרום · שדרות בן גוריון 88 (1.8 ק״מ)',
];

const DAY_MS = 86400000;
const fmtRange = (s, e) => {
  const o = { day: 'numeric', month: 'long' };
  return `${new Date(s).toLocaleDateString('he-IL', o)} – ${new Date(e).toLocaleDateString('he-IL', o)}`;
};

export default function CheckoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { labelOf } = useCategories();

  const item = state?.item;
  const startDate = state?.startDate;
  const endDate = state?.endDate;

  const [card, setCard] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    email: user?.email || '', phone: user?.phone || '',
    branch: BRANCHES[0], holder: '', number: '', exp: '', cvc: '', id: '',
  });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useFullBleed(); // full-bleed page — drop the global fixed-navbar spacing

  /* no booking context (refresh / direct hit) → back to the catalog */
  if (!item || !startDate || !endDate) {
    return (
      <div className="tg tg-white" dir="rtl">
        <TgNavbar variant="page" active="items" />
        <main className="checkout"><div className="wrap checkout-empty">
          <div className="detail-title"><h1>אין הזמנה פעילה</h1>
            <div className="sub">חזרו לפריט ובחרו תאריכים כדי להמשיך לתשלום.</div></div>
          <Link className="btn btn-accent" to="/search">לכל הפריטים</Link>
        </div></main>
      </div>
    );
  }

  const dailyRate = Number(item.dailyRate) || 0;
  const days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / DAY_MS));
  const total = days * dailyRate;
  const shekel = (n) => `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;

  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));

  async function pay() {
    setPaying(true); setError('');
    try {
      // create the booking (server computes price + platform fee/owner earnings)
      const { booking } = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({ item: item.id, startDate, endDate }),
      }, token);
      navigate('/checkout/success', {
        replace: true,
        state: { booking, item, startDate, endDate, branch: card.branch },
      });
    } catch (e) {
      setError(e.message || 'התשלום נכשל. נסו שוב.');
      setPaying(false);
    }
  }

  return (
    <div className="tg tg-white" dir="rtl">
      <TgNavbar variant="page" active="items" />

      <main className="checkout">
        <div className="wrap">
          <button className="back" type="button" onClick={() => navigate(`/item/${item.id}`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            חזרה לפריט
          </button>

          <div className="detail-title">
            <h1>השלמת ההזמנה</h1>
            <div className="sub">עוד צעד אחד — ממלאים פרטים ומשלמים בבטחה.</div>
          </div>

          <div className="checkout-grid">

            {/* ───── form ───── */}
            <form className="pay-form" onSubmit={(e) => e.preventDefault()}>
              <div className="fieldset">
                <h3><span className="num">1</span>הפרטים שלכם</h3>
                <div className="field-row">
                  <div className="field"><label>שם פרטי</label>
                    <input type="text" placeholder="ישראל" value={card.firstName} onChange={set('firstName')} /></div>
                  <div className="field"><label>שם משפחה</label>
                    <input type="text" placeholder="ישראלי" value={card.lastName} onChange={set('lastName')} /></div>
                </div>
                <div className="field"><label>אימייל</label>
                  <input type="email" placeholder="israel@example.com" value={card.email} onChange={set('email')} /></div>
                <div className="field"><label>טלפון נייד</label>
                  <input type="tel" placeholder="050-0000000" value={card.phone} onChange={set('phone')} /></div>
              </div>

              <div className="fieldset">
                <h3><span className="num">2</span>נקודת איסוף</h3>
                <div className="field">
                  <label>בחרו סניף קרוב</label>
                  <select value={card.branch} onChange={set('branch')}>
                    {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="fieldset">
                <h3><span className="num">3</span>פרטי תשלום</h3>
                <div className="field"><label>שם בעל הכרטיס</label>
                  <input type="text" placeholder="כפי שמופיע על הכרטיס" value={card.holder} onChange={set('holder')} /></div>
                <div className="field"><label>מספר כרטיס</label>
                  <input type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" value={card.number} onChange={set('number')} /></div>
                <div className="field-row thirds">
                  <div className="field"><label>תוקף</label>
                    <input type="text" placeholder="MM/YY" value={card.exp} onChange={set('exp')} /></div>
                  <div className="field"><label>CVC</label>
                    <input type="text" inputMode="numeric" placeholder="123" value={card.cvc} onChange={set('cvc')} /></div>
                  <div className="field"><label>ת.ז.</label>
                    <input type="text" inputMode="numeric" placeholder="000000000" value={card.id} onChange={set('id')} /></div>
                </div>
                <div className="pay-badges"><span>VISA</span><span>MASTERCARD</span><span>AMEX</span><span>BIT</span></div>
                <div className="secure-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  התשלום מאובטח ומוצפן מקצה לקצה.
                </div>
              </div>
            </form>

            {/* ───── summary ───── */}
            <aside className="summary">
              <div className="summary-head">
                <div className="summary-thumb">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <span className="summary-ph">{item.title?.[0] || '?'}</span>}
                </div>
                <div className="summary-info">
                  <span className="nm">{item.title}</span>
                  <span className="mt">{labelOf(item.category) || 'פריט להשאלה'}</span>
                  <span className="dt">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="1" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    {fmtRange(startDate, endDate)}
                  </span>
                </div>
              </div>
              <div className="summary-body">
                <div className="price-row"><span className="lbl">השאלה ל־{days} ימים</span><span>{shekel(total)}</span></div>
                <div className="summary-total"><span className="t">סך הכול</span><span className="v">{shekel(total)}</span></div>
                {error && <p className="checkout-err">{error}</p>}
                <button className="btn btn-accent" type="button" onClick={pay} disabled={paying}>
                  {paying ? 'מעבד תשלום…' : (total > 0 ? <>שלמו {shekel(total)}</> : 'אישור הזמנה')}
                </button>
              </div>
            </aside>

          </div>
        </div>
      </main>

      <MiniFooter />
    </div>
  );
}
