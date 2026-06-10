import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';
import './AuthPages.css';

/* ── "ביחד" signup (ported from הצטרפות.html) ── */

export default function RegisterPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form,    setForm]    = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // full-screen split layout — drop the global fixed-navbar spacing
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tg tg-white" dir="rtl">
      <div className="auth">

        {/* form side */}
        <div className="auth-form-wrap">
          <form className="auth-form" onSubmit={handleSubmit}>
            <Link className="brand" to="/"><img className="brand-logo" src="/images/logo-trim.png" alt="Click & Pick" /></Link>

            <h1>נעים להכיר</h1>
            <p className="lead">דקה אחת וזהו — פותחים חשבון, מצטרפים לשכונה ומתחילים לשתף.</p>

            {error && <p className="auth-error">{error}</p>}

            <div className="field-row">
              <div className="field">
                <label>שם פרטי</label>
                <input name="firstName" type="text" value={form.firstName} onChange={handleChange} required placeholder="ישראל" />
              </div>
              <div className="field">
                <label>שם משפחה</label>
                <input name="lastName" type="text" value={form.lastName} onChange={handleChange} required placeholder="ישראלי" />
              </div>
            </div>
            <div className="field">
              <label>אימייל</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="israel@example.com" />
            </div>
            <div className="field">
              <label>טלפון נייד</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="050-0000000" />
            </div>
            <div className="field">
              <label>סיסמה</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="לפחות 6 תווים" />
            </div>

            <div className="auth-row">
              <label><input type="checkbox" required /> אני מסכים/ה ל<a href="#">תנאי השימוש</a></label>
            </div>

            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? 'יוצר חשבון…' : 'יצירת חשבון'}
            </button>

            <p className="auth-alt">כבר רשומים? <Link to="/login">התחברו</Link></p>
          </form>
        </div>

        {/* brand panel */}
        <aside className="auth-panel">
          <img className="auth-photo" src="/images/community.png" alt="קהילה מחוברת" />
          <div className="pov" />
          <div className="pc p-mid">
            <h2>שכונה אחת.<br />אינסוף שיתופים.</h2>
            <p>כל פריט שאתם משתפים חוסך כסף לשכן, מקום בבית ופסולת מהכדור. מצטרפים?</p>
          </div>
          <div className="pc p-stats">
            <div><div className="ps-n">₪240K</div><div className="ps-l">נחסכו לקהילה</div></div>
            <div><div className="ps-n">12 טון</div><div className="ps-l">פסולת שנמנעה</div></div>
          </div>
        </aside>

      </div>
    </div>
  );
}
