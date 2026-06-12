import useFeedbackForm from '../hooks/useFeedbackForm';

const TYPES = [
  { value: 'recommendation', label: 'המלצה' },
  { value: 'question', label: 'שאלה' },
];

const FeedbackForm = () => {
  const { form, done, busy, err, set, submit } = useFeedbackForm();

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
};

export default FeedbackForm;
