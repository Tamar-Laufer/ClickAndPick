import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/services/api';
import useAuthForm from '../hooks/useAuthForm';
import FormInput from '../../../shared/ui/FormInput';
import Button from '../../../shared/ui/Button';
import './AuthPages.css';

export default function ForgotPasswordPage() {
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

            {error && <p className="auth-error">{error}</p>}
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
