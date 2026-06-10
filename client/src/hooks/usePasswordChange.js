import { useState } from 'react';
import { apiFetch } from '../services/api';
import { useAsyncAction } from './useAsyncAction';

/* ── usePasswordChange ─────────────────────────────────────────────────────
   The "שינוי סיסמה" form: the three fields, a success message, and the submit.
   The loading/error pair is delegated to useAsyncAction; `savePassword` adds the
   form-only bits (preventDefault + the "new passwords match" check) before the
   PUT /auth/password request, and clears the fields on success. */
export function usePasswordChange(token) {
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const { run, loading: pwSaving, error: pwErr, setError: setPwErr } = useAsyncAction(async () => {
    await apiFetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
    }, token);
    setPw({ currentPassword: '', newPassword: '', confirm: '' });
    setPwMsg('הסיסמה עודכנה בהצלחה');
  });

  function savePassword(e) {
    e.preventDefault();
    setPwMsg('');
    if (pw.newPassword !== pw.confirm) { setPwErr('הסיסמאות החדשות אינן תואמות'); return; }
    run();
  }

  return { pw, setPw, pwMsg, pwErr, pwSaving, savePassword };
}
