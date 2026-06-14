import { useState } from 'react';
import useApi from '../../../shared/hooks/useApi';

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
    if (ok === undefined) return;
    setPw({ currentPassword: '', newPassword: '', confirm: '' });
    setPwMsg('הסיסמה עודכנה בהצלחה');
  };

  return { pw, setPw, pwMsg, pwErr, pwSaving, savePassword };
};

export default usePasswordChange;
