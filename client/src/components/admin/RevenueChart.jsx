const shekelK = (n) => (n >= 1000 ? `₪${(n / 1000).toFixed(1)}K` : `₪${Math.round(n)}`);

/* ── RevenueChart ──────────────────────────────────────────────────────────
   The manager's monthly earnings as a bar chart, with a year toggle when more
   than one year of data exists. */
export default function RevenueChart({ chart, maxBar, years, activeYear, setYear }) {
  return (
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
  );
}
