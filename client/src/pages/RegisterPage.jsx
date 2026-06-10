import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { useAuthForm } from '../hooks/useAuthForm';
import { useFullBleed } from '../hooks/useFullBleed';
import FormInput from '../components/ui/FormInput';
import Button from '../components/ui/Button';
import AuthPanel from '../components/auth/AuthPanel';
import './AuthPages.css';

/* ── "ביחד" signup (ported from הצטרפות.html) ── */

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  useFullBleed();

  const { form, handleChange, error, loading, submit } =
    useAuthForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });

  const handleSubmit = submit(async (values) => {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(values) });
    login(data.user, data.token);
    navigate('/');
  });

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
              <FormInput label="שם פרטי" name="firstName" value={form.firstName} onChange={handleChange} required placeholder="ישראל" />
              <FormInput label="שם משפחה" name="lastName" value={form.lastName} onChange={handleChange} required placeholder="ישראלי" />
            </div>
            <FormInput label="אימייל" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="israel@example.com" />
            <FormInput label="טלפון נייד" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="050-0000000" />
            <FormInput label="סיסמה" name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="לפחות 6 תווים" />

            <div className="auth-row">
              <label><input type="checkbox" required /> אני מסכים/ה ל<a href="#">תנאי השימוש</a></label>
            </div>

            <Button type="submit" loading={loading} busyLabel="יוצר חשבון…">יצירת חשבון</Button>

            <p className="auth-alt">כבר רשומים? <Link to="/login">התחברו</Link></p>
          </form>
        </div>

        <AuthPanel
          heading={<>שכונה אחת.<br />אינסוף שיתופים.</>}
          text="כל פריט שאתם משתפים חוסך כסף לשכן, מקום בבית ופסולת מהכדור. מצטרפים?"
          stats={[
            { n: '₪240K', label: 'נחסכו לקהילה' },
            { n: '12 טון', label: 'פסולת שנמנעה' },
          ]}
        />

      </div>
    </div>
  );
}
