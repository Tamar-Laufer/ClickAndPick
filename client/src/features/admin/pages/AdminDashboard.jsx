import { useAuth } from '../../../shared/context/AuthContext';
import useAdminDashboard from '../hooks/useAdminDashboard';
import TgNavbar from '../../../shared/layout/TgNavbar';
import MiniFooter from '../../../shared/layout/MiniFooter';
import Loader from '../../../shared/ui/Loader';
import AdminKpis from '../components/AdminKpis';
import RevenueChart from '../components/RevenueChart';
import StatusDonut from '../components/StatusDonut';
import AdminUsers from '../components/AdminUsers';
import AdminItems from '../components/AdminItems';
import CategoryManager from '../components/CategoryManager';
import AdminInbox from '../components/AdminInbox';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const {
    stats, err, setYear,
    years, activeYear, chart, maxBar, donut,
  } = useAdminDashboard(token);

  if (err) return <Shell><div className="admin-state">שגיאה: {err}</div></Shell>;
  if (!stats) return <Shell><Loader className="admin-state" /></Shell>;

  const completed = (stats.bookingsByStatus || []).find((r) => r.status === 'COMPLETED')?.count || 0;
  const ratePct = Math.round((stats.managerRate || 0.1) * 100);

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

          <AdminUsers currentUserId={user?.id} />

          <AdminItems />

        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="tg tg-admin" dir="rtl">
      <TgNavbar variant="page" />
      {children}
      <MiniFooter note="לוח ניהול" />
    </div>
  );
}
