import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

/* ── useProfileData ────────────────────────────────────────────────────────
   Owns the live data + booking actions behind the profile's "ניהול ההשאלות
   והפריטים" manager: the user's own items, the items they've rented, and the
   incoming requests for their items (server scopes each to the JWT user).
   Also exposes the mutating actions — approve/reject/return a booking, and the
   soft-delete of an own item — plus `itemStatus`, the loan state of one own
   item derived from its incoming bookings. Extracted verbatim from ProfilePage
   so the page is left rendering, not fetching. */
export function useProfileData(token) {
  const [myItems, setMyItems] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  /* delete-item confirmation */
  const [deletingItem, setDeletingItem] = useState(null); // item pending delete confirmation, or null
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  /* load the real items + bookings (server scopes each to the JWT user) */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setListErr('');
    try {
      const [it, mine, inc] = await Promise.all([
        apiFetch('/items/mine', {}, token),
        apiFetch('/dashboard/my-rentals', {}, token),
        apiFetch('/dashboard/incoming-requests', {}, token),
      ]);
      setMyItems(it.items || []);
      setRentals(mine.bookings || []);
      setIncoming(inc.bookings || []);
    } catch (e) {
      setListErr(e.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on mount and whenever `load` (i.e. the token) changes. The setState
  // inside `load` is the necessary loading/data toggle of a data fetch, not a
  // synchronous render-loop, so the set-state-in-effect rule does not apply.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  /* PATCH /bookings/:id/status — the server re-verifies permission (403 if not allowed) */
  const handleAction = useCallback(async (id, status) => {
    setBusyId(id); setListErr('');
    try {
      await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
      await load();
    } catch (e) {
      setListErr(e.message || 'הפעולה נכשלה');
    } finally {
      setBusyId(null);
    }
  }, [token, load]);

  /* DELETE /items/:id — soft-delete on the server (blocked if the item has
     active/approved/pending bookings). On success drop it from local state so it
     disappears without a refetch; on failure surface the server's message. */
  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    setDeleteBusy(true); setDeleteErr('');
    try {
      await apiFetch(`/items/${deletingItem.id}`, { method: 'DELETE' }, token);
      setMyItems(items => items.filter(it => it.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (e) {
      setDeleteErr(e.message || 'מחיקת הפריט נכשלה');
    } finally {
      setDeleteBusy(false);
    }
  }, [deletingItem, token]);

  /* loan status of one of the user's own items, derived from its incoming bookings */
  const itemStatus = useCallback((item) => {
    const now = new Date();
    const bks = incoming.filter(b => String(b.item?.id || b.item) === String(item.id));
    if (bks.some(b => b.status === 'APPROVED' && new Date(b.startDate) <= now && now <= new Date(b.endDate)))
      return { label: 'מושאל כעת', cls: 'active' };
    const pending = bks.filter(b => b.status === 'PENDING').length;
    if (pending) return { label: `${pending} בקשות ממתינות`, cls: 'pending' };
    if (bks.some(b => b.status === 'APPROVED' && new Date(b.startDate) > now))
      return { label: 'מאושר להשאלה', cls: 'approved' };
    if (item.isActive === false) return { label: 'מוסתר', cls: 'cancelled' };
    return { label: 'זמין', cls: 'available' };
  }, [incoming]);

  return {
    myItems, setMyItems, rentals, incoming,
    loading, listErr, load,
    busyId, handleAction, itemStatus,
    deletingItem, setDeletingItem, deleteBusy, deleteErr, setDeleteErr, confirmDelete,
  };
}
