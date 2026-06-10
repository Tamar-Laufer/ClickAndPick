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
