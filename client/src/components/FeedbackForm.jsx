import { useState } from 'react';
import { apiFetch } from '../hooks/useApi';

/* ── Public contact / feedback form ────────────────────────────────────────
   Lives in the site footer (where real sites put "contact us"). Anyone — no
   login — sends a question or a recommendation.
   POST /api/feedback  → { name, email, type, message }
   Recommendations only reach the homepage carousel after an admin approves
   them in the inbox; questions are inbox-only. Dark footer styling: `.fc-*`
   in HomePage.css. */

const TYPES = [
  { value: 'recommendation', label: 'המלצה' },
  { value: 'question', label: 'שאלה' },
];

export default function FeedbackForm() {
  const [form, setForm] = useState({ name: '', email: '', type: 'recommendation', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => {
    if (done) setDone(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await apiFetch('/feedback', { method: 'POST', body: JSON.stringify(form) });
      // Empty the whole form after a successful send, and show a thank-you note.
      setForm({ name: '', email: '', type: 'recommendation', message: '' });
      setDone(true);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fc" id="contact">
      <h4>צור קשר</h4>

      {done && <p className="fc-thanks">תודה! הפנייה התקבלה. המלצות שיאושרו יופיעו בדף הבית. אפשר לשלוח עוד פנייה.</p>}

      <form className="fc-form" onSubmit={submit}>
          <div className="fc-types">
            {TYPES.map((t) => (
              <label key={t.value} className={`fc-radio${form.type === t.value ? ' on' : ''}`}>
                <input
                  type="radio"
                  name="fc-type"
                  value={t.value}
                  checked={form.type === t.value}
                  onChange={set('type')}
                />
                {t.label}
              </label>
            ))}
          </div>
          <input
            type="text" value={form.name} onChange={set('name')}
            placeholder="השם שלכם" aria-label="שם" required maxLength={80}
          />
          <input
            type="email" value={form.email} onChange={set('email')}
            placeholder="אימייל" aria-label="אימייל" required
          />
          <textarea
            value={form.message} onChange={set('message')}
            placeholder={form.type === 'recommendation' ? 'ספרו לנו על החוויה שלכם…' : 'במה נוכל לעזור?'}
            aria-label="הודעה" rows={3} required maxLength={1000}
          />
          {err && <p className="fc-err">{err}</p>}
          <button className="fc-send" type="submit" disabled={busy}>
            {busy ? 'שולח…' : 'שליחה'}
          </button>
        </form>
    </div>
  );
}
