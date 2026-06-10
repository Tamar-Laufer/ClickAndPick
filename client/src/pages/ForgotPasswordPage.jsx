import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthLayout } from '../hooks/useAuthLayout';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import './AuthPages.css';

/* ── "ביחד" forgot-password ──
   Asks only for an email and always shows the same generic confirmation,
   matching the server's anti-enumeration response (we never reveal whether the
   address is registered). */

export default function ForgotPasswordPage() {
  useAuthLayout();
  const { form, handleChange, error, loading, submit } = useAuthForm({ email: '' });
  const [message, setMessage] = useState('');   // generic success text from the server

  const handleSubmit = submit(async ({ email }) => {
    const data = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    // Server replies with a generic message whether or not the email exists.
    setMessage(data.message || 'אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס.');
  });

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
                <FormInput
                  label="אימייל"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="israel@example.com"
                />
                <Button type="submit" loading={loading} busyLabel="שולח…">שליחת קישור לאיפוס</Button>
              </>
            )}

            <p className="auth-alt">נזכרתם? <Link to="/login">חזרה להתחברות</Link></p>
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
