const shekel = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;

const Icon = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);

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

export default function AdminKpis({ stats, completed, ratePct }) {
  return (
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
  );
}
