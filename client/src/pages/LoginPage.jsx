import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthLayout } from '../hooks/useAuthLayout';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import './AuthPages.css';

/* ── "ביחד" login (ported from כניסה.html) ── */

export default function LoginPage() {
  const { login, logout, user } = useAuth();
  const location   = useLocation();
  // Where to go after login. Two sources, in priority order:
  //  1. ?next=<path> — set by the email buttons; carries its own query string
  //     (e.g. /profile?review=…&as=owner) so the deep link survives login.
  //  2. state.from — set by ProtectedRoute when it bounced an unauthenticated
  //     user here; we keep its full path AND search (not just pathname).
  const search   = new URLSearchParams(location.search);
  const rawNext  = search.get('next');
  // Only honour internal paths ("/…", but not "//host") so a crafted ?next=
  // can't turn the login into an open redirect to an external site.
  const nextParam = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;
  const fromState = location.state?.from
    ? location.state.from.pathname + (location.state.from.search || '')
    : null;
  const from = nextParam || fromState;
  // True when we arrived from an email button. Such a link is addressed to one
  // specific recipient, so if a different/stale session is already cached in this
  // (possibly shared) browser we must NOT silently show it — we gate on identity.
  const fromEmail = Boolean(nextParam);
  // one-time flash set by the reset-password redirect ("הסיסמה אופסה בהצלחה…")
  const notice = location.state?.notice;

  const { form, handleChange, error, loading, submit } = useAuthForm({ email: '', password: '' });
  // set once the user has authenticated here (or confirmed "continue as me" on the
  // email identity gate); only then do we allow the redirect to the destination.
  const [confirmed, setConfirmed] = useState(false);

  // full-screen split layout — drop the global fixed-navbar spacing
  useAuthLayout();

  const handleSubmit = submit(async (values) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(values) });
    setConfirmed(true);            // a fresh login here is, by definition, the right person
    login(data.user, data.token);  // sets `user` → the redirect below fires on re-render
  });

  // Logged in AND cleared to proceed (normal navigation, or confirmed on the gate)
  // → go to the intended page / role default.
  if (user && (!fromEmail || confirmed))
    return <Navigate to={from || (user.role === 'ADMIN' ? '/admin' : '/')} replace />;

  // Email link opened while a session is already active → confirm identity before
  // showing any private page. The recipient either continues as the current
  // account, or switches (logout clears it, revealing the login form below).
  if (user && fromEmail && !confirmed) {
    return (
      <div className="tg tg-white" dir="rtl">
        <div className="auth">
          <div className="auth-form-wrap">
            <div className="auth-form">
              <Link className="brand" to="/"><img className="brand-logo" src="/images/logo-trim.png" alt="Click & Pick" /></Link>
              <h1>אישור זהות</h1>
              <p className="lead">הקישור נשלח לחשבון אישי. כרגע מחובר/ת בדפדפן הזה:</p>
              <p className="auth-asuser"><strong>{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</strong><br />{user.email}</p>
              <Button variant="accent" onClick={() => setConfirmed(true)}>
                המשך כ{user.name || user.firstName || user.email}
              </Button>
              <Button variant="line" className="on-light" onClick={logout}>
                זה לא אני — התחברות לחשבון אחר
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tg tg-white" dir="rtl">
      <div className="auth">

        {/* form side */}
        <div className="auth-form-wrap">
          <form className="auth-form" onSubmit={handleSubmit}>
            <Link className="brand" to="/"><img className="brand-logo" src="/images/logo-trim.png" alt="Click & Pick" /></Link>

            <h1>טוב לראות אתכם שוב</h1>
            <p className="lead">התחברו כדי לשאול פריטים מהשכנים, לנהל הזמנות ולעקוב אחרי ההשפעה שלכם.</p>

            {notice && <p className="auth-success">{notice}</p>}
            {error && <p className="auth-error">{error}</p>}

            <FormInput label="אימייל" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="israel@example.com" />
            <FormInput label="סיסמה" name="password" type="password" value={form.password} onChange={handleChange} required placeholder="••••••••" />

            <div className="auth-row">
              <label><input type="checkbox" /> זכרו אותי</label>
              <Link to="/forgot-password">שכחתם סיסמה?</Link>
            </div>

            <Button type="submit" loading={loading} busyLabel="מתחבר…">התחברות</Button>

            <p className="auth-alt">עוד אין לכם חשבון? <Link to="/register">הצטרפו בחינם</Link></p>
          </form>
        </div>

        <AuthPanel
          heading={<>פחות לקנות.<br />יותר לשתף.</>}
          text="הצטרפו לקהילה שכבר חולקת אלפי פריטים — וחוסכת כסף, מקום ופסולת, ביחד."
          stats={[
            { n: '5,200+', label: 'פריטים שותפו' },
            { n: '1,800', label: 'שכנים פעילים' },
          ]}
        />

      </div>
    </div>
  );
}
