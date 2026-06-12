import { useState } from 'react';
import { apiFetch, uploadImage } from '../../../shared/services/api';

export default function useAvatarUpload(user, token, updateUser) {
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
      cancelAvatar(); 
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
