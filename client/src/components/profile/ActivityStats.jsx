/* ── ActivityStats ─────────────────────────────────────────────────────────
   The "הפעילות שלי" card — four counters: items shared, items rented, requests
   received, and the average rating (or "—" before any reviews). */
export default function ActivityStats({ itemCount, rentalCount, incomingCount, rating, reviewCount }) {
  return (
    <div className="prof-card">
      <h3>הפעילות שלי</h3>
      <div className="prof-stats">
        <div className="prof-stat"><div className="n">{itemCount}</div><div className="l">פריטים שיתפתי</div></div>
        <div className="prof-stat"><div className="n">{rentalCount}</div><div className="l">פריטים ששאלתי</div></div>
        <div className="prof-stat"><div className="n">{incomingCount}</div><div className="l">בקשות שקיבלתי</div></div>
        <div className="prof-stat"><div className="n">{reviewCount > 0 ? rating.toFixed(1) : '—'}</div><div className="l">דירוג ממוצע</div></div>
      </div>
    </div>
  );
}
