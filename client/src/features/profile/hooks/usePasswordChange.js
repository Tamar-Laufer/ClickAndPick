import { useState } from 'react';
import useApi from '../../../shared/hooks/useApi';

/* ── usePasswordChange ─────────────────────────────────────────────────────
   The "שינוי סיסמה" form: the three fields, a success message, and the submit.
   Loading/error come from useApi; savePassword adds the form-only bits
   (preventDefault + the "new passwords match" check) before PUT /auth/password,
   and clears the fields on success. */
const usePasswordChange = () => {
  const { apiCall, execute, loading: pwSaving, error: pwErr, setError: setPwErr } = useApi();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pw.newPassword !== pw.confirm) { setPwErr('הסיסמאות החדשות אינן תואמות'); return; }
    const ok = await execute(() => apiCall('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
    }));
    if (ok === undefined) return; // failed → message already in pwErr
    setPw({ currentPassword: '', newPassword: '', confirm: '' });
    setPwMsg('הסיסמה עודכנה בהצלחה');
  };

  return { pw, setPw, pwMsg, pwErr, pwSaving, savePassword };
};

export default usePasswordChange;
