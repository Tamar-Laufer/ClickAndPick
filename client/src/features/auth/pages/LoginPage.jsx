import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';
import useAuthForm from '../hooks/useAuthForm';
import { fullName } from '../../../shared/utils/format';
import FormInput from '../../../shared/ui/FormInput';
import Button from '../../../shared/ui/Button';
import './AuthPages.css';

const LoginPage = () => {
  const { login, logout, user } = useAuth();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const rawNext = search.get('next');
  const nextParam = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;
  const fromState = location.state?.from
    ? location.state.from.pathname + (location.state.from.search || '')
    : null;
  const from = nextParam || fromState;
  const fromEmail = Boolean(nextParam);
  const notice = location.state?.notice;
  const { form, handleChange, error, loading, submit } = useAuthForm({ email: '', password: '' });
  const [confirmed, setConfirmed] = useState(false);
  const handleSubmit = submit(async (values) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(values) });
    setConfirmed(true);
    login(data.user, data.token);
  });

  if (user && (!fromEmail || confirmed))
    return <Navigate to={from || (user.role === 'ADMIN' ? '/admin' : '/')} replace />;
  if (user && fromEmail && !confirmed) {
    return (
      <div className="tg tg-white" dir="rtl">
        <div className="auth">
          <div className="auth-form-wrap">
            <div className="auth-form">
              <Link className="brand" to="/"><img className="brand-logo" src="/images/logo-trim.png" alt="Click & Pick" /></Link>
              <h1>אישור זהות</h1>
              <p className="lead">הקישור נשלח לחשבון אישי. כרגע מחובר/ת בדפדפן הזה:</p>
              <p className="auth-asuser"><strong>{user.name || fullName(user)}</strong><br />{user.email}</p>
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
        <aside className="auth-panel">
          <img className="auth-photo" src="/images/community.png" alt="קהילה מחוברת" />
          <div className="pov" />
          <div className="pc p-mid">
            <h2> פחות לקנות.<br />יותר לשתף.</h2>
            <p>הצטרפו לקהילה שכבר חולקת אלפי פריטים — וחוסכת כסף, מקום ופסולת, ביחד.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LoginPage;
