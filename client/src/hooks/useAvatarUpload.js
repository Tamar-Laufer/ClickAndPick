import { useState } from 'react';
import { apiFetch, uploadImage } from '../services/api';

/* ── useAvatarUpload ───────────────────────────────────────────────────────
   Profile-photo state + actions, independent of the details "edit" mode.
   Picking a file only stages a local PREVIEW; nothing is saved until the user
   confirms ("שמירת תמונה"). On confirm we upload to /uploads/image and PUT the
   URL to /auth/profile so it survives a refresh. "ביטול" discards the preview;
   "הסרת תמונה" clears the saved photo.

   `avatar` is the saved photo shown on the page; `pendingFile`/`pendingPreview`
   hold a freshly-picked image that is NOT saved until the user confirms. */
export function useAvatarUpload(user, token, updateUser) {
  const [avatar, setAvatar] = useState(user?.avatarUrl || null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');

  function pickAvatar(e) {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!f) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setAvatarErr('');
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
  }

  function cancelAvatar() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setAvatarErr('');
  }

  async function saveAvatar() {
    if (!pendingFile) return;
    setAvatarBusy(true); setAvatarErr('');
    try {
      const url = await uploadImage(pendingFile, token);
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: url }),
      }, token);
      updateUser(data.user);
      setAvatar(url);
      cancelAvatar(); // clear the staged preview now that it's saved
    } catch (err) {
      setAvatarErr(err.message || 'שמירת התמונה נכשלה');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true); setAvatarErr('');
    try {
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: '' }),
      }, token);
      updateUser(data.user);
      setAvatar(null);
    } catch (err) {
      setAvatarErr(err.message || 'הסרת התמונה נכשלה');
    } finally {
      setAvatarBusy(false);
    }
  }

  return {
    avatar, pendingPreview, avatarBusy, avatarErr,
    pickAvatar, cancelAvatar, saveAvatar, removeAvatar,
  };
}
