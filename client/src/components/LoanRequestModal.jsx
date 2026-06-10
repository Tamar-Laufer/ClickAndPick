import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { fullName } from '../utils/format';
import AvailabilityCalendar from './AvailabilityCalendar';
import Modal from './Modal';
import './LoanRequestModal.css';

/* Date picker step of the booking flow. Collects the loan dates via a visual
   calendar that disables already-booked days, then hands off to the checkout
   page ("המשך לתשלום"). The booking is only created later, when the renter pays
   on the checkout page. */
export default function LoanRequestModal({ item, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    startDate: '',
    endDate:   '',
  });
  const [error, setError] = useState('');
  // confirmed booking ranges for this item — used to disable days on the calendar
  const [bookedRanges, setBookedRanges] = useState([]);

  /* Load the unavailable date ranges when the modal opens. A failure is
     non-fatal: the calendar just shows every day as free and the server still
     re-checks availability when the booking is created. */
  useEffect(() => {
    if (!item?.id) return;
    let alive = true;
    apiFetch(`/items/${item.id}/booked-dates`)
      .then(d => { if (alive) setBookedRanges(d.bookedDates || []); })
      .catch(() => { if (alive) setBookedRanges([]); });
    return () => { alive = false; };
  }, [item?.id]);

  const dailyRate = Number(item.dailyRate) || 0;
  const days = form.startDate && form.endDate
    ? Math.max(0, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000))
    : 0;
  const estTotal = days * dailyRate;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.startDate) {
      setError('בחרו תאריך השאלה בלוח');
      return;
    }
    if (!form.endDate || form.endDate <= form.startDate) {
      setError('בחרו תאריך החזרה אחרי תאריך ההשאלה');
      return;
    }
    setError('');
    // carry the item + chosen dates to checkout; payment creates the booking
    navigate('/checkout', {
      state: { item, startDate: form.startDate, endDate: form.endDate },
    });
  }

  return (
    <Modal onClose={onClose} showClose>
        <>
            {/* Header */}
            <div className="modal-header">
              <h2 className="modal-title">בחירת תאריכים</h2>
              <p className="modal-item-name">{item.title}</p>
              {item.owner && (item.owner.firstName || item.owner.lastName) && (
                <p className="modal-location">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>
                  </svg>
                  מאת {fullName(item.owner)}
                </p>
              )}
            </div>

            {/* Links like LoT */}
            <div className="modal-info-links">
              <button className="modal-info-link">
                חסכו עם חברות מוזלת
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button className="modal-info-link">
                כיצד תקופות השאלה עובדות
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}

            {/* Form */}
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-field">
                <label className="modal-label">בחרו תאריכים *</label>
                <AvailabilityCalendar
                  bookedRanges={bookedRanges}
                  value={form}
                  onChange={({ startDate, endDate }) => { setError(''); setForm({ startDate, endDate }); }}
                />
                <p className="modal-location modal-date-line">
                  {form.startDate
                    ? <span>{form.startDate}{form.endDate ? ` ← ${form.endDate}` : ' · בחרו תאריך החזרה'}</span>
                    : <span>בחרו את תאריך ההשאלה בלוח</span>}
                </p>
              </div>

              {days > 0 && (
                <p className="modal-location modal-total-line">
                  <span>{days} ימים × ₪{dailyRate}</span>
                  <strong>סה״כ ₪{estTotal}</strong>
                </p>
              )}

              <button type="submit" className="modal-submit">
                המשך לתשלום
              </button>
            </form>
          </>
    </Modal>
  );
}
