import { useState } from 'react';
import { apiFetch } from '../../../shared/services/api';

const EXTRA_KEY = 'yachad_profile_extra';

/* ── useProfileForm ────────────────────────────────────────────────────────
   The "פרטים אישיים" form. The four real fields (firstName/lastName/phone +
   email read-only) persist via PUT /auth/profile; the extra design-only fields
   (area/address/bio) have no backend model yet, so they live in localStorage.
   They are hydrated once, synchronously, in the initializer (was a post-mount
   effect that caused an extra render). `toggleEdit` enters edit mode on the
   first call and saves on the second. */
export default function useProfileForm(user, token, updateUser) {
  const [form, setForm] = useState(() => {
    const base = {
      firstName: user?.firstName || '', lastName: user?.lastName || '',
      phone: user?.phone || '', area: '', address: '', bio: '',
    };
    try {
      const extra = JSON.parse(localStorage.getItem(EXTRA_KEY));
      if (extra) return { ...base, ...extra };
    } catch { /* ignore malformed storage */ }
    return base;
  });
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const field = (id, v) => setForm(f => ({ ...f, [id]: v }));

  async function toggleEdit() {
    if (!editing) { setEditing(true); setMsg(''); setErr(''); return; }
    // saving
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
