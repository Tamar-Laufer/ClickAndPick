import { useAuth } from '../context/AuthContext';
import { useFullBleed } from '../hooks/useFullBleed';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import TgNavbar from '../components/layout/TgNavbar';
import MiniFooter from '../components/layout/MiniFooter';
import Loader from '../components/ui/Loader';
import AdminKpis from '../components/admin/AdminKpis';
import RevenueChart from '../components/admin/RevenueChart';
import StatusDonut from '../components/admin/StatusDonut';
import UsersTable from '../components/admin/UsersTable';
import CategoryManager from '../components/admin/CategoryManager';
import AdminInbox from '../components/admin/AdminInbox';
import './AdminDashboard.css';

/* ── "ביחד" admin dashboard (לוח ניהול) ──────────────────────────────────────
   Ported from the Claude Design prototype (ניהול.html). The data + derivations
   live in useAdminDashboard; each panel (KPIs, revenue chart, status donut,
   users table) is its own component. The headline financial KPI is the site
   manager's personal cut — 5% of every transaction's gross. */
export default function AdminDashboard() {
  const { user, token } = useAuth();
  useFullBleed();
  const {
    stats, err, setYear, query, setQuery,
    years, activeYear, chart, maxBar, donut, filteredUsers, toggleUserActive,
  } = useAdminDashboard(token);

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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V5z" /></svg>
              מנהל/ת
            </span>
          </div>

          <AdminKpis stats={stats} completed={completed} ratePct={ratePct} />

          <div className="admin-grid">
            <RevenueChart chart={chart} maxBar={maxBar} years={years} activeYear={activeYear} setYear={setYear} />
            <StatusDonut donut={donut} />
          </div>

          <CategoryManager />

          <AdminInbox />

          <UsersTable
            users={filteredUsers}
            query={query}
            setQuery={setQuery}
            currentUserId={user?.id}
            onToggle={toggleUserActive}
          />

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
      <MiniFooter note="לוח ניהול" />
    </div>
  );
}
