import { useEffect, useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';

const PAGE_SIZE = 20;

/* ── useAdminItems ─────────────────────────────────────────────────────────
   Server-side paginated + searchable items list for the admin moderation
   table (includes suspended items). Mirrors useAdminUsers: the server does the
   skip/limit + search; this only holds the current page/search. */
export default function useAdminItems() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  /* Refetch on page/search change, debounced 300ms so typing fires one call. */
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (search.trim()) params.set('q', search.trim());
        const data = await apiFetch(`/admin/items?${params}`, {}, token);
        if (!alive) return;
        setItems(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setError('');
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setIsLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [token, page, search]);

  const onSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  /* Toggle one item's active flag and patch just that row locally — no refetch. */
  async function toggleStatus(item) {
    try {
      const { item: updated } = await apiFetch(
        `/admin/items/${item.id}/toggle-active`,
        { method: 'PATCH' },
        token,
      );
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isActive: updated.isActive } : it)));
    } catch (e) {
      setError(e.message);
    }
  }

  return { items, page, setPage, search, onSearch, totalPages, isLoading, error, toggleStatus };
}
