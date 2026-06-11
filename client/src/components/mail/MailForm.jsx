import { useState } from 'react';
import './MailForm.css';

/* ── MailForm — a self-contained contact / email component ──────────────────
   Separation of Concerns: this file owns ONLY structure + behaviour (state,
   validation, conditional rendering). Every visual rule lives in MailForm.css.
   No inline styles, no innerHTML, no direct DOM access — pure React.

   Props:
     title        — heading text (default below).
     onSend(data) — optional async sender; receives
                    { name, email, subject, message }. When omitted the form
                    resolves successfully on its own (demo / standalone mode),
                    so the component is usable anywhere without a backend. */

// Standard email shape: local-part @ domain . tld, with no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function MailForm({ title = 'צרו קשר במייל', onSend }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  // 'idle' | 'sending' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [sendError, setSendError] = useState('');

  // One change handler for every field; also clears that field's error and
  // dismisses a previous success/error banner the moment the user edits again.
  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    if (status === 'success' || status === 'error') setStatus('idle');
  };

  function validate(values) {
    const found = {};
    if (!values.name.trim()) found.name = 'נא להזין שם';
    if (!values.email.trim()) found.email = 'נא להזין כתובת מייל';
    else if (!EMAIL_RE.test(values.email.trim())) found.email = 'כתובת המייל אינה תקינה';
    if (!values.message.trim()) found.message = 'נא להזין תוכן הודעה';
    return found;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'sending') return;

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus('error');
      setSendError('');
      return;
    }

    setStatus('sending');
    setSendError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      };
      if (onSend) await onSend(payload);
      setForm(EMPTY);
      setStatus('success');
    } catch (err) {
      setSendError(err?.message || 'שליחת המייל נכשלה, נסו שוב.');
      setStatus('error');
    }
  }

  return (
    <section className="mail" dir="rtl" aria-labelledby="mail-title">
      <h3 id="mail-title" className="mail-title">{title}</h3>
      <p className="mail-sub">נשמח לשמוע מכם — מלאו את הפרטים ונחזור אליכם במייל.</p>

      {status === 'success' && (
        <p className="mail-banner mail-banner--success" role="status">
          ההודעה נשלחה בהצלחה! נחזור אליכם במייל בהקדם.
        </p>
      )}
      {status === 'error' && sendError && (
        <p className="mail-banner mail-banner--error" role="alert">{sendError}</p>
      )}

      <form className="mail-form" onSubmit={handleSubmit} noValidate>
        <div className="mail-row">
          <div className="mail-field">
            <label className="mail-label" htmlFor="mail-name">שם</label>
            <input
              id="mail-name"
              type="text"
              className={`mail-input${errors.name ? ' mail-input--invalid' : ''}`}
              value={form.name}
              onChange={update('name')}
              placeholder="השם שלכם"
              autoComplete="name"
            />
            {errors.name && <span className="mail-hint">{errors.name}</span>}
          </div>

          <div className="mail-field">
            <label className="mail-label" htmlFor="mail-email">כתובת מייל</label>
            <input
              id="mail-email"
              type="email"
              className={`mail-input${errors.email ? ' mail-input--invalid' : ''}`}
              value={form.email}
              onChange={update('email')}
              placeholder="name@example.com"
              autoComplete="email"
              dir="ltr"
            />
            {errors.email && <span className="mail-hint">{errors.email}</span>}
          </div>
        </div>

        <div className="mail-field">
          <label className="mail-label" htmlFor="mail-subject">
            נושא <span className="mail-optional">(לא חובה)</span>
          </label>
          <input
            id="mail-subject"
            type="text"
            className="mail-input"
            value={form.subject}
            onChange={update('subject')}
            placeholder="נושא ההודעה"
          />
        </div>

        <div className="mail-field">
          <label className="mail-label" htmlFor="mail-message">הודעה</label>
          <textarea
            id="mail-message"
            className={`mail-input mail-textarea${errors.message ? ' mail-input--invalid' : ''}`}
            value={form.message}
            onChange={update('message')}
            placeholder="כתבו את ההודעה כאן…"
            rows={5}
          />
          {errors.message && <span className="mail-hint">{errors.message}</span>}
        </div>

        <button type="submit" className="mail-submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'שולח…' : 'שליחת מייל'}
        </button>
      </form>
    </section>
  );
}
