import { useEffect, useState } from 'react';
import { apiFetch } from '../../../shared/services/api';

const MONTHS_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

const STATUS_META = {
  COMPLETED: { label: 'הושלמו', color: 'var(--block)' },
  APPROVED:  { label: 'פעילות', color: 'var(--accent)' },
  PENDING:   { label: 'ממתינות לאישור', color: 'var(--butter)' },
  CANCELLED: { label: 'בוטלו', color: '#B23A66' },
};
const STATUS_ORDER = ['COMPLETED', 'APPROVED', 'PENDING', 'CANCELLED'];

function buildDonut(stats) {
  const rows = STATUS_ORDER
    .map((s) => ({ ...STATUS_META[s], value: (stats?.bookingsByStatus || []).find((r) => r.status === s)?.count || 0 }))
    .filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);
  const segs = rows.map((d, i) => {
    const before = rows.slice(0, i).reduce((a, x) => a + x.value, 0);
    const from = total ? (before / total) * 360 : 0;
    const to = total ? ((before + d.value) / total) * 360 : 0;
    return `${d.color} ${from}deg ${to}deg`;
  });
  return { rows, total, gradient: segs.join(', ') };
}

export default function useAdminDashboard(token) {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  const [year, setYear] = useState(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const { stats: s } = await apiFetch('/admin/stats', {}, token);
        setStats(s);
      } catch (e) {
        setErr(e.message);
      }
    };
    load();
  }, [token]);

  const byMonth = stats?.managerEarningsByMonth || [];
  const years = [...new Set(byMonth.map((r) => r.month.split('-')[0]))].sort().reverse();
  const activeYear = year || years[0];
  const chart = activeYear
    ? Array.from({ length: 12 }, (_, i) => {
      const key = `${activeYear}-${String(i + 1).padStart(2, '0')}`;
      const row = byMonth.find((r) => r.month === key);
      return { label: MONTHS_HE[i], value: row ? row.total : 0 };
    })
    : [];
  const maxBar = Math.max(...chart.map((c) => c.value), 1);

  const donut = buildDonut(stats);

  return {
    stats, err, year, setYear,
    years, activeYear, chart, maxBar, donut,
  };
}
