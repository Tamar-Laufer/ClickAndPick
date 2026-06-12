export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'שגיאת שרת');
  return data;
}

export function getChatHistory(chatWithUserId, token) {
  return apiFetch(`/messages/${chatWithUserId}`, {}, token);
}

export function saveMessage({ recipient, text, type = 'text' }, token) {
  return apiFetch('/messages', { method: 'POST', body: JSON.stringify({ recipient, text, type }) }, token);
}

async function uploadFile(path, field, file, filename, token, errorMessage) {
  const fd = new FormData();
  if (filename) fd.append(field, file, filename);
  else fd.append(field, file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || errorMessage);
  return data.url;
}

export function uploadImage(file, token) {
  return uploadFile('/uploads/image', 'image', file, null, token, 'שגיאה בהעלאת התמונה');
}

export function uploadAudio(blob, token) {
  const ext = (blob.type.split(';')[0].split('/')[1] || 'webm').replace('mpeg', 'mp3');
  return uploadFile('/uploads/audio', 'audio', blob, `voice.${ext}`, token, 'שגיאה בהעלאת ההקלטה');
}

export async function fetchAudioObjectUrl(apiPath, token) {
  const url = apiPath.startsWith('/api') ? `${BASE}${apiPath.slice(4)}` : `${BASE}${apiPath}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('שגיאה בטעינת ההקלטה');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
