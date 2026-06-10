import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useAuthForm } from '../hooks/useAuthForm';
import { useFullBleed } from '../hooks/useFullBleed';
import FormInput from '../components/ui/FormInput';
import Button from '../components/ui/Button';
import AuthPanel from '../components/auth/AuthPanel';
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
  useFullBleed();

  const { form, handleChange, error, loading, submit } =
    useAuthForm({ newPassword: '', confirmPassword: '' });

  const handleSubmit = submit(
    async ({ newPassword }) => {
      await apiFetch(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      // Clear any existing session so the login page shows its form (instead of
      // auto-redirecting a still-logged-in user straight into the app), forcing
      // a fresh sign-in with the new password.
      logout();
      // success → send them to login with a one-time flash message
      navigate('/login', { replace: true, state: { notice: 'הסיסמה אופסה בהצלחה — התחברו עם הסיסמה החדשה.' } });
    },
    {
      // client-side validation (the server enforces these too)
      validate: (f) => {
        if (f.newPassword.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים.';
        if (f.newPassword !== f.confirmPassword) return 'הסיסמאות אינן תואמות.';
        return '';
      },
    },
  );

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

            <FormInput
              label="סיסמה חדשה"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <FormInput
              label="אימות סיסמה"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} busyLabel="מאפס…">איפוס הסיסמה</Button>

            <p className="auth-alt">נזכרתם בסיסמה? <Link to="/login">חזרה להתחברות</Link></p>
          </form>
        </div>

        <AuthPanel
          heading={<>פחות לקנות.<br />יותר לשתף.</>}
          text="הצטרפו לקהילה שכבר חולקת אלפי פריטים — וחוסכת כסף, מקום ופסולת, ביחד."
        />

      </div>
    </div>
  );
}
