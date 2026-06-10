import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import TgNavbar from '../components/TgNavbar';
import CategoryManager from '../components/CategoryManager';
import AdminInbox from '../components/AdminInbox';
import Avatar from '../components/Avatar';
import Loader from '../components/Loader';
import { fullName } from '../utils/format';
import './AdminDashboard.css';

/* ── "ביחד" admin dashboard (לוח ניהול) ──────────────────────────────────────
   Ported from the Claude Design prototype (ניהול.html). Wired to the real
   admin API:
     GET   /admin/stats                            → KPIs, revenue/earnings, charts
     GET   /admin/users         + users/:id/active → users table
   The headline financial KPI is the site manager's personal cut — 5% of every
   transaction's gross — computed server-side (stats.managerEarnings). */

const MONTHS_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
const shekel = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
const shekelK = (n) => (n >= 1000 ? `₪${(n / 1000).toFixed(1)}K` : `₪${Math.round(n)}`);

// donut status mapping (stored enum → label + colour), in display order
const STATUS_META = {
  COMPLETED: { label: 'הושלמו', color: 'var(--block)' },
  APPROVED:  { label: 'פעילות', color: 'var(--accent)' },
  PENDING:   { label: 'ממתינות לאישור', color: 'var(--butter)' },
  CANCELLED: { label: 'בוטלו', color: '#B23A66' },
};
const STATUS_ORDER = ['COMPLETED', 'APPROVED', 'PENDING', 'CANCELLED'];
const AV_COLORS = ['var(--block)', 'var(--accent)', '#B8841A', '#B23A66', '#2D6BE0'];

const Icon = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [year, setYear] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

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

  if (err) return <Shell><div className="admin-state">שגיאה: {err}</div></Shell>;
  if (!stats) return <Shell><Loader className="admin-state" /></Shell>;

  const completed = (stats.bookingsByStatus || []).find((r) => r.status === 'COMPLETED')?.count || 0;
  const ratePct = Math.round((stats.managerRate || 0.05) * 100);

  return (
    <Shell>
      <main className="admin">
        <div className="wrap">

          <div className="admin-head">
            <div>
              <h1>לוח ניהול</h1>
              <div className="sub">סקירת הפעילות בפלטפורמה · שלום, {user?.name || 'מנהל/ת'}</div>
            </div>
            <span className="admin-tag">
              <Icon d={<path d="M12 2 4 5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V5z" />} />
              מנהל/ת
            </span>
          </div>

          {/* ── KPIs ── */}
          <div className="kpis">
            <Kpi tone="coral"
              icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>}
              label="משתמשים בקהילה" value={Number(stats.users).toLocaleString('he-IL')} sub="סך הכול רשומים" />
            <Kpi tone="teal"
              icon={<><path d="M21 8 12 3 3 8l9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>}
              label="פריטים בפלטפורמה" value={Number(stats.items).toLocaleString('he-IL')} sub={`${stats.activeItems} פעילים כעת`} />
            <Kpi tone="butter"
              icon={<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></>}
              label="סך ההזמנות" value={Number(stats.bookings).toLocaleString('he-IL')} sub={`${completed} הושלמו`} />
            <Kpi tone="ink"
              icon={<><circle cx="12" cy="12" r="9" /><path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2.5 0 0 1 9.5 15" /></>}
              label="הרווח שלי" value={shekel(stats.managerEarnings)} sub={`עמלת ${ratePct}% מכל עסקה`} />
          </div>

          {/* ── charts ── */}
          <div className="admin-grid">
            <div className="panel">
              <div className="panel-head">
                <h2>הרווח שלי לפי חודש</h2>
                {years.length > 1 && (
                  <div className="pick">
                    {years.map((y) => (
                      <button key={y} className={`seg${y === activeYear ? ' on' : ''}`} onClick={() => setYear(y)}>{y}</button>
                    ))}
                  </div>
                )}
              </div>
              {chart.length === 0 || maxBar <= 0 ? (
                <p className="chart-empty">אין עדיין הזמנות שהושלמו</p>
              ) : (
                <div className="chart">
                  {chart.map((c, i) => (
                    <div className="bar-col" key={i}>
                      <div className="bar-track">
                        <div className="bar" style={{ '--bar-h': `${(c.value / maxBar) * 180}px` }}>
                          <span className="val">{shekelK(c.value)}</span>
                        </div>
                      </div>
                      <span className="bar-label">{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-head"><h2>הזמנות לפי סטטוס</h2></div>
              {donut.total === 0 ? (
                <p className="chart-empty">אין עדיין הזמנות</p>
              ) : (
                <div className="orders-by">
                  <div className="donut" style={{ '--donut-grad': `conic-gradient(${donut.gradient})` }}>
                    <div className="donut-center"><span className="n">{donut.total.toLocaleString('he-IL')}</span><span className="l">הזמנות</span></div>
                  </div>
                  <div className="legend">
                    {donut.rows.map((d) => (
                      <div className="leg" key={d.label}><span className="sw" style={{ '--sw-c': d.color }} />{d.label}<span className="lv">{d.value}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── category manager ── */}
          <CategoryManager />

          {/* ── feedback inbox (public submissions) ── */}
          <AdminInbox />

          {/* ── users ── */}
          <div className="panel">
            <div className="panel-head">
              <h2>משתמשים</h2>
              <div className="search">
                <Icon strokeWidth="1.8" d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>} />
                <input type="search" placeholder="חיפוש משתמש…" aria-label="חיפוש" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            <div className="table-wrap">
              <table className="users">
                <thead>
                  <tr><th>משתמש</th><th>מד אמון</th><th>הזמנות</th><th>פריטים</th><th>סטטוס</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => {
                    const name = fullName(u, 'משתמש');
                    const trust = Number.isFinite(Number(u.trustScore)) ? Number(u.trustScore) : 50;
                    const tCls = trust >= 80 ? 'hi' : trust >= 60 ? 'mid' : 'lo';
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className={u.isActive ? '' : 'disabled'}>
                        <td>
                          <div className="u-cell">
                            {u.avatarUrl
                              ? <Avatar user={u} name={name} size={36} className="u-av" />
                              : <span className="u-av" style={{ '--av-c': AV_COLORS[i % AV_COLORS.length] }}>{(name || '?')[0]}</span>}
                            <div><div className="u-name">{name}</div><div className="u-mail">{u.email}</div></div>
                          </div>
                        </td>
                        <td>
                          <div className="trust-mini">
                            <span className="trust-bar"><span className={`trust-fill ${tCls}`} style={{ '--trust-w': `${trust}%` }} /></span>
                            <span className="trust-val">{trust}</span>
                          </div>
                        </td>
                        <td>{u.bookingCount}</td>
                        <td>{u.itemCount}</td>
                        <td><span className={`u-status ${u.isActive ? 'active' : 'off'}`}><span className="d" />{u.isActive ? 'פעיל' : 'מושבת'}</span></td>
                        <td>
                          {isSelf
                            ? <span className="u-self">זה אני</span>
                            : <button className={`u-action${u.isActive ? ' danger' : ''}`} onClick={() => toggleUserActive(u)}>{u.isActive ? 'השבתה' : 'הפעלה'}</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="tg" dir="rtl">
      <TgNavbar variant="page" />
      {children}
      <footer className="mini-footer">
        <div className="wrap">
          <img className="mf-logo" src="/images/logo-light.png" alt="Click & Pick" />
          <span>© {new Date().getFullYear()} ביחד · לוח ניהול</span>
        </div>
      </footer>
    </div>
  );
}

function Kpi({ tone, icon, label, value, sub }) {
  return (
    <div className={`kpi k-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-ic"><Icon d={icon} /></span>
      </div>
      <div className="kpi-n">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
