import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useCategories } from '../../../shared/context/CategoriesContext';
import TgNavbar from '../../../shared/layout/TgNavbar';
import './SuccessPage.css';

const fmtRange = (s, e) => {
  const o = { day: 'numeric', month: 'long' };
  return `${new Date(s).toLocaleDateString('he-IL', o)} – ${new Date(e).toLocaleDateString('he-IL', o)}`;
};

export default function SuccessPage() {
  const { state } = useLocation();
  const { labelOf } = useCategories();
  const booking = state?.booking;
  const item = state?.item || booking?.item;
  const startDate = state?.startDate || booking?.startDate;
  const endDate = state?.endDate || booking?.endDate;
  const branch = state?.branch;


  const orderNo = useMemo(() => {
    const tail = booking?.id ? String(booking.id).slice(-6).toUpperCase() : '——————';
    return `#YH-${tail}`;
  }, [booking]);

  if (!booking || !item) {
    return (
      <div className="tg tg-white" dir="rtl">
        <TgNavbar variant="page" active="items" />
        <main className="success">
          <div className="success-card">
            <div className="success-body success-empty">
              <h1>אין הזמנה להצגה</h1>
              <p>ההזמנה כבר אושרה או שהדף נפתח ישירות.</p>
              <Link className="btn btn-accent" to="/profile">להזמנות שלי</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const total = Number(booking.totalPrice) || 0;
  const shekel = (n) => `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;

  return (
    <div className="tg tg-white" dir="rtl">
      <TgNavbar variant="page" active="items" />

      <main className="success">
        <div className="success-card">
          <div className="success-top">
            <div className="success-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h1>התשלום בוצע!</h1>
            <p>ההזמנה אושרה ושמרנו לכם את הפריט. נתראה בשכונה</p>
          </div>

          <div className="success-body">
            <div className="receipt">
              <div className="receipt-row"><span className="k">מספר הזמנה</span><span className="v">{orderNo}</span></div>
              <div className="receipt-row"><span className="k">פריט</span><span className="v">{item.title}</span></div>
              <div className="receipt-row"><span className="k">קטגוריה</span><span className="v">{labelOf(item.category) || 'פריט להשאלה'}</span></div>
              <div className="receipt-row"><span className="k">תקופת השאלה</span><span className="v">{fmtRange(startDate, endDate)}</span></div>
              <div className="receipt-row total"><span className="k">שולם</span><span className="v">{shekel(total)}</span></div>
            </div>

            <div className="pickup-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <div>
                <div className="pt">איסוף · {branch ? branch.split(' · ')[0] : 'בתיאום עם המשאיל'}</div>
                <div className="pa">
                  {branch ? `${branch.replace(/^.*? · /, '').replace(/\s*\([^)]*\)\s*$/, '')} · ` : ''}
                  שלחנו לכם אימייל עם כל הפרטים והברקוד לאיסוף.
                </div>
              </div>
            </div>

            <div className="success-actions">
              <Link className="btn btn-accent" to="/profile">להזמנות שלי</Link>
              <Link className="btn btn-line on-light" to="/search">המשך לגלות פריטים</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
