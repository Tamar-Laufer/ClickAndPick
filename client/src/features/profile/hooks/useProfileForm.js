import { useState } from 'react';
import { apiFetch } from '../../../shared/services/api';

const EXTRA_KEY = 'yachad_profile_extra';

export default function useProfileForm(user, token, updateUser) {
  const [form, setForm] = useState(() => {
    const base = {
      firstName: user?.firstName || '', lastName: user?.lastName || '',
      phone: user?.phone || '', area: '', address: '', bio: '',
    };
    try {
      const extra = JSON.parse(localStorage.getItem(EXTRA_KEY));
      if (extra) return { ...base, ...extra };
    } catch { }
    return base;
  });
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const field = (id, v) => setForm(f => ({ ...f, [id]: v }));

  async function toggleEdit() {
    if (!editing) { setEditing(true); setMsg(''); setErr(''); return; }
    setSaving(true); setErr(''); setMsg('');
    try {
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone }),
      }, token);
      updateUser(data.user);
      localStorage.setItem(EXTRA_KEY,
        JSON.stringify({ area: form.area, address: form.address, bio: form.bio }));
      setMsg('הפרטים נשמרו בהצלחה');
      setEditing(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return { form, field, editing, msg, err, saving, toggleEdit };
}
