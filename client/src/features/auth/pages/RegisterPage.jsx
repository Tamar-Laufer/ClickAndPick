import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';
import useAuthForm from '../hooks/useAuthForm';
import FormInput from '../../../shared/ui/FormInput';
import Button from '../../../shared/ui/Button';
import './AuthPages.css';

const EMPTY = { firstName: '', lastName: '', email: '', password: '', phone: '' };
const DRAFT_KEY = 'cp.register.draft';

function readDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    return d && typeof d === 'object' ? { ...EMPTY, ...d } : EMPTY;
  } catch { return EMPTY; }
}

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const { form, handleChange, error, loading, submit } = useAuthForm(readDraft());

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { }
  }, [form]);

  const handleSubmit = submit(async (values) => {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(values) });
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { }
    login(data.user, data.token);
    navigate('/');
  });

  return (
    <div className="tg tg-white" dir="rtl">
      <div className="auth">

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
              <label><input type="checkbox" required /> אני מסכים/ה ל<Link to="/terms">תנאי השימוש</Link></label>
            </div>

            <Button type="submit" loading={loading} busyLabel="יוצר חשבון…">יצירת חשבון</Button>

            <p className="auth-alt">כבר רשומים? <Link to="/login">התחברו</Link></p>
          </form>
        </div>

        <aside className="auth-panel">
          <img className="auth-photo" src="/images/community.png" alt="קהילה מחוברת" />
          <div className="pov" />
          <div className="pc p-mid">
            <h2>שכונה אחת.<br />אינסוף שיתופים.</h2>
            <p>כל פריט שאתם משתפים חוסך כסף לשכן, מקום בבית ופסולת מהכדור. מצטרפים?</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
