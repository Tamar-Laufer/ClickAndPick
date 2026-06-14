import { useEffect, useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { apiFetch } from '../../../shared/services/api';

const PAGE_SIZE = 20;

export default function useAdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (search.trim()) params.set('q', search.trim());
        const data = await apiFetch(`/admin/users?${params}`, {}, token);
        if (!alive) return;
        setUsers(data.users || []);
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

  async function toggleStatus(user) {
    try {
      const { user: updated } = await apiFetch(
        `/admin/users/${user.id}/toggle-status`,
        { method: 'PATCH' },
        token,
      );
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u)));
    } catch (e) {
      setError(e.message);
    }
  }

  return { users, page, setPage, search, onSearch, totalPages, isLoading, error, toggleStatus };
}
