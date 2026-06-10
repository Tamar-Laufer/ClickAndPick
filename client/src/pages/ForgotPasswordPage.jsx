import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import './AuthPages.css';

/* ── "ביחד" forgot-password ──
   Asks only for an email and always shows the same generic confirmation,
   matching the server's anti-enumeration response (we never reveal whether the
   address is registered). */

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');   // generic success text from the server
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // full-screen split layout — drop the global fixed-navbar spacing
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      // Server replies with a generic message whether or not the email exists.
      setMessage(data.message || 'אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס.');
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

            <h1>שכחתם סיסמה?</h1>
            <p className="lead">הזינו את כתובת האימייל שלכם ונשלח אליכם קישור לאיפוס הסיסמה.</p>

            {error   && <p className="auth-error">{error}</p>}
            {message && <p className="auth-success">{message}</p>}

            {/* once the request is sent, hide the form and just leave the confirmation */}
            {!message && (
              <>
                <div className="field">
                  <label>אימייל</label>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="israel@example.com"
                  />
                </div>

                <button type="submit" className="btn btn-accent" disabled={loading}>
                  {loading ? 'שולח…' : 'שליחת קישור לאיפוס'}
                </button>
              </>
            )}

            <p className="auth-alt">נזכרתם? <Link to="/login">חזרה להתחברות</Link></p>
          </form>
        </div>

        {/* brand panel */}
        <aside className="auth-panel">
          <img className="auth-photo" src="/images/community.png" alt="קהילה מחוברת" />
          <div className="pov" />
          <div className="pc p-mid">
            <h2>פחות לקנות.<br />יותר לשתף.</h2>
            <p>הצטרפו לקהילה שכבר חולקת אלפי פריטים — וחוסכת כסף, מקום ופסולת, ביחד.</p>
          </div>
        </aside>

      </div>
    </div>
  );
}
