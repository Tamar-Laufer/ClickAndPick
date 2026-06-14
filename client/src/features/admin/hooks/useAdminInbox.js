import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';

const PAGE_SIZE = 8;

export default function useAdminInbox() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);

  const pagePath = useCallback((pg) => {
    const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
    if (filter !== 'all') params.set('type', filter);
    return `/admin/feedback?${params}`;
  }, [filter]);

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
      setApprovedCount((c) => Math.max(0, c + (feedback.isApprovedForHomepage ? 1 : -1)));
    } catch (e) {
      setErr(e.message);
    }
  }

  return { items, filter, setFilter, err, loading, hasMore, loadMore, moreBusy, approvedCount, toggleApprove };
}
