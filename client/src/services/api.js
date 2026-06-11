// Central API/fetch service for the client.
// Wraps fetch with the base URL, JSON headers, optional bearer token,
// and unified error handling (throws Error with the server message).

export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'שגיאת שרת');
  return data;
}

// ── Chat persistence ───────────────────────────────────────────────────────
// Real-time delivery goes through the C++ WebSocket service (port 8080); these
// hit the Node REST API, which is the single source of truth for chat history.

// GET /messages/:chatWithUserId → { messages: [{ _id, sender, recipient, text, type, createdAt }] }
export function getChatHistory(chatWithUserId, token) {
  return apiFetch(`/messages/${chatWithUserId}`, {}, token);
}

// POST /messages → { message: {...} }. Persists one message (sender taken from the token).
export function saveMessage({ recipient, text, type = 'text' }, token) {
  return apiFetch('/messages', { method: 'POST', body: JSON.stringify({ recipient, text, type }) }, token);
}

// Upload a single image to POST /uploads/image and resolve to its hosted URL.
// Uses raw fetch (not apiFetch) so the browser sets the multipart boundary
// itself — apiFetch forces application/json, which would corrupt the upload.
export async function uploadImage(file, token) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${BASE}/uploads/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'שגיאה בהעלאת התמונה');
  return data.url;
}

// ── Private voice messages ──────────────────────────────────────────────────
// The audio folder is NOT served statically; both upload and playback require a
// bearer token. We therefore can't point an <audio src> at the protected URL
// directly (the element can't send an Authorization header) — instead we POST
// the blob to get a protected path, and GET it back as a blob to build an
// object URL for playback.

// Upload a recorded voice Blob to POST /uploads/audio → protected relative path
// (e.g. "/api/uploads/audio/<random>.webm"). That clean path is what gets stored
// as the message text; it carries no host and no token.
export async function uploadAudio(blob, token) {
  const fd = new FormData();
  // give multer a filename with the right extension so it maps the container
  const ext = (blob.type.split(';')[0].split('/')[1] || 'webm').replace('mpeg', 'mp3');
  fd.append('audio', blob, `voice.${ext}`);
  const res = await fetch(`${BASE}/uploads/audio`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'שגיאה בהעלאת ההקלטה');
  return data.url;
}

// Fetch a protected audio path with the bearer token and return a playable
// object URL. `apiPath` is the stored message text (e.g. "/api/uploads/audio/x").
// The caller is responsible for URL.revokeObjectURL when the player unmounts.
export async function fetchAudioObjectUrl(apiPath, token) {
  // stored paths are "/api/uploads/..."; BASE already ends in "/api"
  const url = apiPath.startsWith('/api') ? `${BASE}${apiPath.slice(4)}` : `${BASE}${apiPath}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('שגיאה בטעינת ההקלטה');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
