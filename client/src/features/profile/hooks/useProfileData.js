import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../shared/services/api';

// How many cards each tab pulls per request. The lists load this first chunk on
// mount and fetch the next one only when the user asks ("טען עוד") — the server
// never ships the whole history at once.
const PAGE_SIZE = 6;

const ENDPOINTS = {
  items: '/items/mine',
  rentals: '/dashboard/my-rentals',
  incoming: '/dashboard/incoming-requests',
};
// Each endpoint nests its rows under a different key.
const ROWS_KEY = { items: 'items', rentals: 'bookings', incoming: 'bookings' };

const pagePath = (tab, page) => `${ENDPOINTS[tab]}?page=${page}&limit=${PAGE_SIZE}`;

export default function useProfileData(token) {
  const [myItems, setMyItems] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [incoming, setIncoming] = useState([]);

  // Server totals (for tab badges + ActivityStats), current page, and whether a
  // next chunk exists — kept per tab so each list pages independently.
  const [counts, setCounts] = useState({ items: 0, rentals: 0, incoming: 0 });
  const [pages, setPages] = useState({ items: 1, rentals: 1, incoming: 1 });
  const [hasMore, setHasMore] = useState({ items: false, rentals: false, incoming: false });

  const [loading, setLoading] = useState(true);  // initial first-chunk load
  const [moreBusy, setMoreBusy] = useState(null); // tab currently fetching "load more"
  const [listErr, setListErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [deletingItem, setDeletingItem] = useState(null); // item pending delete confirmation, or null
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  /* (Re)load the first chunk of all three lists — used on mount and after any
     action that can change statuses. Resets each tab back to page 1. */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setListErr('');
    try {
      const [it, mine, inc] = await Promise.all([
        apiFetch(pagePath('items', 1), {}, token),
        apiFetch(pagePath('rentals', 1), {}, token),
        apiFetch(pagePath('incoming', 1), {}, token),
      ]);
      setMyItems(it.items || []);
      setRentals(mine.bookings || []);
      setIncoming(inc.bookings || []);
      setCounts({
        items: it.pagination?.totalItems ?? (it.items || []).length,
        rentals: mine.pagination?.totalItems ?? (mine.bookings || []).length,
        incoming: inc.pagination?.totalItems ?? (inc.bookings || []).length,
      });
      setHasMore({
        items: !!it.pagination?.hasMore,
        rentals: !!mine.pagination?.hasMore,
        incoming: !!inc.pagination?.hasMore,
      });
      setPages({ items: 1, rentals: 1, incoming: 1 });
    } catch (e) {
      setListErr(e.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  /* Fetch the next chunk for one tab and append it to what's already shown. */
  const loadMore = useCallback(async (tab) => {
    if (!token || moreBusy || !hasMore[tab]) return;
    const next = pages[tab] + 1;
    const setRows = tab === 'items' ? setMyItems : tab === 'rentals' ? setRentals : setIncoming;
    setMoreBusy(tab); setListErr('');
    try {
      const data = await apiFetch(pagePath(tab, next), {}, token);
      const rows = data[ROWS_KEY[tab]] || [];
      setRows((prev) => [...prev, ...rows]);
      setPages((p) => ({ ...p, [tab]: next }));
      setHasMore((h) => ({ ...h, [tab]: !!data.pagination?.hasMore }));
      if (data.pagination?.totalItems != null) {
        setCounts((c) => ({ ...c, [tab]: data.pagination.totalItems }));
      }
    } catch (e) {
      setListErr(e.message || 'שגיאה בטעינת פריטים נוספים');
    } finally {
      setMoreBusy(null);
    }
  }, [token, moreBusy, hasMore, pages]);

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

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    setDeleteBusy(true); setDeleteErr('');
    try {
      await apiFetch(`/items/${deletingItem.id}`, { method: 'DELETE' }, token);
      setMyItems(items => items.filter(it => it.id !== deletingItem.id));
      setCounts(c => ({ ...c, items: Math.max(0, c.items - 1) }));
      setDeletingItem(null);
    } catch (e) {
      setDeleteErr(e.message || 'מחיקת הפריט נכשלה');
    } finally {
      setDeleteBusy(false);
    }
  }, [deletingItem, token]);

  // The lending-status badge is now derived server-side (per page) and ships on
  // each item, so it stays correct even though the profile no longer holds the
  // full incoming-requests list. Fall back to a sane default for safety.
  const itemStatus = useCallback(
    (item) => item.status || { label: item.isActive === false ? 'מוסתר' : 'זמין', cls: item.isActive === false ? 'cancelled' : 'available' },
    [],
  );

  return {
    myItems, setMyItems, rentals, incoming,
    counts, hasMore, loadMore, moreBusy,
    loading, listErr, load,
    busyId, handleAction, itemStatus,
    deletingItem, setDeletingItem, deleteBusy, deleteErr, setDeleteErr, confirmDelete,
  };
}
