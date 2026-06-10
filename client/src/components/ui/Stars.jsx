/* ── Stars ─────────────────────────────────────────────────────────────────
   5-star display — fills `value` rounded stars. */
export default function Stars({ value = 0 }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className="stars" aria-label={`${(Number(value) || 0).toFixed(1)} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={i <= v ? 'on' : ''} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
      ))}
    </span>
  );
}
