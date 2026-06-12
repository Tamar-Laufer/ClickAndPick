import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';

// The inbox loads 8 rows per request and fetches the next chunk only when the
// admin asks — recommendations and questions never all arrive at once.
const PAGE_SIZE = 8;

/* ── useAdminInbox ─────────────────────────────────────────────────────────
   Data + actions behind the admin "תיבת פניות" panel. The server pages the
   list (GET /admin/feedback?page&limit&type) and filters by type, so switching
   the filter reloads from page 1. `approvedCount` is the GLOBAL number of
   recommendations on the homepage (server-computed), kept accurate as you page
   and toggle. */
export default function useAdminInbox() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);   // initial / filter-change load
  const [moreBusy, setMoreBusy] = useState(false); // "load more" in flight

  const pagePath = useCallback((pg) => {
    const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
    if (filter !== 'all') params.set('type', filter);
    return `/admin/feedback?${params}`;
  }, [filter]);

  // Load the first chunk; re-runs whenever the filter changes (back to page 1).
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const d = await apiFetch(pagePath(1), {}, token);
        if (!alive) return;
        setItems(d.feedback || []);
        setApprovedCount(d.approvedCount || 0);
        setHasMore(!!d.pagination?.hasMore);
        setPage(1);
        setErr('');
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, pagePath]);

  const loadMore = useCallback(async () => {
    if (!token || moreBusy || !hasMore) return;
    const next = page + 1;
    setMoreBusy(true);
    try {
      const d = await apiFetch(pagePath(next), {}, token);
      setItems((prev) => [...prev, ...(d.feedback || [])]);
      setHasMore(!!d.pagination?.hasMore);
      setPage(next);
    } catch (e) {
      setErr(e.message);
    } finally {
      setMoreBusy(false);
    }
  }, [token, moreBusy, hasMore, page, pagePath]);

  async function toggleApprove(id) {
    try {
      const { feedback } = await apiFetch(
        `/admin/feedback/${id}/toggle-approve`,
        { method: 'PATCH' },
        token,
      );
      setItems((prev) => prev.map((f) => (f.id === id ? feedback : f)));
      // Keep the global "shown on homepage" tally in sync without a refetch.
      setApprovedCount((c) => Math.max(0, c + (feedback.isApprovedForHomepage ? 1 : -1)));
    } catch (e) {
      setErr(e.message);
    }
  }

  return { items, filter, setFilter, err, loading, hasMore, loadMore, moreBusy, approvedCount, toggleApprove };
}
