import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';
import useAuthForm from '../hooks/useAuthForm';
import FormInput from '../../../shared/ui/FormInput';
import Button from '../../../shared/ui/Button';
import './AuthPages.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { logout } = useAuth();

  const { form, handleChange, error, loading, submit } =
    useAuthForm({ newPassword: '', confirmPassword: '' });

  const handleSubmit = submit(
    async ({ newPassword }) => {
      await apiFetch(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });

      logout();
      navigate('/login', { replace: true, state: { notice: 'הסיסמה אופסה בהצלחה — התחברו עם הסיסמה החדשה.' } });
    },
    {
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
}
