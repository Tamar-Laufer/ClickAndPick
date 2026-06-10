/* ── StatusDonut ───────────────────────────────────────────────────────────
   Orders-by-status as a conic-gradient donut + legend. `donut` (rows / total /
   gradient) is pre-computed in useAdminDashboard. */
export default function StatusDonut({ donut }) {
  return (
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
  );
}
