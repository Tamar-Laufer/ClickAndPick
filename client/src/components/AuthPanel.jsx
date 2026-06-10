/* ── AuthPanel ─────────────────────────────────────────────────────────────
   The brand/marketing aside shared by every auth screen. Only the heading,
   blurb and (optional) stat pair differ between pages, so those are props. */
export default function AuthPanel({ heading, text, stats }) {
  return (
    <aside className="auth-panel">
      <img className="auth-photo" src="/images/community.png" alt="קהילה מחוברת" />
      <div className="pov" />
      <div className="pc p-mid">
        <h2>{heading}</h2>
        <p>{text}</p>
      </div>
      {stats && (
        <div className="pc p-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="ps-n">{s.n}</div>
              <div className="ps-l">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
