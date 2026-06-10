import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import './AuthPages.css';

/* ── "ביחד" reset-password ──
   Reached from the email deep link /reset-password/:token. The raw token rides
   in the URL; we POST it untouched and the server hashes + matches it. Validates
   the two passwords match (min 6, matching the server rule) before submitting,
   then redirects to /login on success. */

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { logout } = useAuth();

  const [form, setForm]       = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // full-screen split layout — drop the global fixed-navbar spacing
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // client-side validation (the server enforces these too)
    if (form.newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: form.newPassword }),
      });
      // Clear any existing session so the login page shows its form (instead of
      // auto-redirecting a still-logged-in user straight into the app), forcing
      // a fresh sign-in with the new password.
      logout();
      // success → send them to login with a one-time flash message
      navigate('/login', { replace: true, state: { notice: 'הסיסמה אופסה בהצלחה — התחברו עם הסיסמה החדשה.' } });
    } catch (err) {
      // covers "Invalid or expired token" (400) and any other server error
      setError(err.message);
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

            <h1>בחירת סיסמה חדשה</h1>
            <p className="lead">הזינו סיסמה חדשה לחשבון שלכם. ודאו שהיא באורך 6 תווים לפחות.</p>

            {error && <p className="auth-error">{error}</p>}

            <div className="field">
              <label>סיסמה חדשה</label>
              <input
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label>אימות סיסמה</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? 'מאפס…' : 'איפוס הסיסמה'}
            </button>

            <p className="auth-alt">נזכרתם בסיסמה? <Link to="/login">חזרה להתחברות</Link></p>
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
