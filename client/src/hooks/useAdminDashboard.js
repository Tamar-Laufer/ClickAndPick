import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { fullName } from '../utils/format';

const MONTHS_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

// donut status mapping (stored enum → label + colour), in display order
const STATUS_META = {
  COMPLETED: { label: 'הושלמו', color: 'var(--block)' },
  APPROVED:  { label: 'פעילות', color: 'var(--accent)' },
  PENDING:   { label: 'ממתינות לאישור', color: 'var(--butter)' },
  CANCELLED: { label: 'בוטלו', color: '#B23A66' },
};
const STATUS_ORDER = ['COMPLETED', 'APPROVED', 'PENDING', 'CANCELLED'];

/* ── useAdminDashboard ─────────────────────────────────────────────────────
   The admin dashboard's data + derivations: fetches GET /admin/stats and
   /admin/users, then shapes them into the revenue-by-month chart (the manager's
   5% cut, with a year toggle), the orders-by-status donut, and the searchable
   users table. `toggleUserActive` flips a user's active flag and patches the
   row in place. */
export function useAdminDashboard(token) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [year, setYear] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch('/admin/stats', {}, token),
      apiFetch('/admin/users', {}, token),
    ])
      .then(([s, u]) => {
        setStats(s.stats);
        setUsers(u.users || []);
      })
      .catch((e) => setErr(e.message));
  }, [token]);

  /* ── revenue-by-month chart (manager's 5% earnings), with a year toggle ── */
  const byMonth = useMemo(() => stats?.managerEarningsByMonth || [], [stats]);
  const years = useMemo(
    () => [...new Set(byMonth.map((r) => r.month.split('-')[0]))].sort().reverse(),
    [byMonth],
  );
  const activeYear = year || years[0];
  const chart = useMemo(() => {
    if (!activeYear) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${activeYear}-${String(i + 1).padStart(2, '0')}`;
      const row = byMonth.find((r) => r.month === key);
      return { label: MONTHS_HE[i], value: row ? row.total : 0 };
    });
  }, [byMonth, activeYear]);
  const maxBar = Math.max(...chart.map((c) => c.value), 1);

  /* ── orders-by-status donut ── */
  const donut = useMemo(() => {
    const rows = STATUS_ORDER
      .map((s) => ({ ...STATUS_META[s], value: (stats?.bookingsByStatus || []).find((r) => r.status === s)?.count || 0 }))
      .filter((d) => d.value > 0);
    const total = rows.reduce((a, d) => a + d.value, 0);
    // cumulative segment boundaries, computed functionally (no mutable accumulator)
    const segs = rows.map((d, i) => {
      const before = rows.slice(0, i).reduce((a, x) => a + x.value, 0);
      const from = total ? (before / total) * 360 : 0;
      const to = total ? ((before + d.value) / total) * 360 : 0;
      return `${d.color} ${from}deg ${to}deg`;
    });
    return { rows, total, gradient: segs.join(', ') };
  }, [stats]);

  /* ── users table ── */
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      fullName(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [users, query]);

  async function toggleUserActive(u) {
    try {
      const { user: updated } = await apiFetch(`/admin/users/${u.id}/active`,
        { method: 'PATCH', body: JSON.stringify({ isActive: !u.isActive }) }, token);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: updated.isActive } : x)));
    } catch (e) { setErr(e.message); }
  }

  return {
    stats, err, year, setYear, query, setQuery,
    years, activeYear, chart, maxBar, donut, filteredUsers, toggleUserActive,
  };
}
