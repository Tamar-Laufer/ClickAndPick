const RING_C = 2 * Math.PI * 36;
export default function TrustMeter({ user, rating, reviewCount }) {
  const trustPct = Number.isFinite(Number(user.trustScore)) ? Number(user.trustScore) : 50;
  const isNewMember = reviewCount === 0 && Number(user.completedTransactions || 0) === 0;
  const ringOffset = RING_C * (1 - trustPct / 100);
  const completedTx = Number(user.completedTransactions) || 0;
  const cancelledTx = Number(user.cancelledTransactions) || 0;
  const trustParts = [
    { key: 'quality', label: 'איכות הדירוג', value: Math.round((rating / 5) * 70), max: 70,
      hint: reviewCount > 0 ? `ממוצע ${rating.toFixed(1)}★` : 'אין ביקורות עדיין' },
    { key: 'volume', label: 'ניסיון בקהילה', value: Math.min(completedTx * 2, 20), max: 20,
      hint: `${completedTx} השאלות שהושלמו` },
    { key: 'reliability', label: 'אמינות', value: Math.max(0, 10 - cancelledTx * 2), max: 10,
      hint: cancelledTx > 0 ? `${cancelledTx} ביטולים אחרי אישור` : 'ללא ביטולים' },
  ];

  return (
    <div className="prof-card">
      <h3>מד האמון שלי</h3>
      <div className="trust-ring-wrap">
        <div className="trust-ring">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle className="arc" cx="44" cy="44" r="36" fill="none" stroke="var(--accent)" strokeWidth="7"
              strokeLinecap="round" strokeDasharray={RING_C.toFixed(1)} strokeDashoffset={ringOffset.toFixed(1)}
              transform="rotate(-90 44 44)" />
          </svg>
          <div className="trust-pct"><strong>{trustPct}</strong><span>מד אמון</span></div>
        </div>
        <div className="trust-copy">
          <div className="tt">{isNewMember ? 'חבר/ה חדש/ה' : trustPct >= 80 ? 'חבר/ה מהימן/ה' : 'בונה אמון'}</div>
          <div className="tc">
            {reviewCount > 0
              ? `דירוג ${rating.toFixed(1)} מתוך ${reviewCount} ביקורות.`
              : 'השלימו השאלות כדי לבנות מוניטין בקהילה.'}
          </div>
        </div>
      </div>

      <ul className="trust-breakdown">
        {trustParts.map(p => (
          <li key={p.key}>
            <div className="tb-row">
              <span className="tb-label">{p.label}</span>
              <span className="tb-val">{p.value}<small>/{p.max}</small></span>
            </div>
            <span className="tb-bar"><i style={{ '--tb-w': `${Math.round((p.value / p.max) * 100)}%` }} /></span>
            <span className="tb-hint">{p.hint}</span>
          </li>
        ))}
      </ul>
      <p className="trust-foot">הציון (0–100) = איכות (עד 70) + ניסיון (2 נק' לכל השאלה, עד 20) + אמינות (עד 10).</p>

      <div className="vbadges">
        <span className="vbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>אימייל מאומת</span>
        <span className={`vbadge${user.phone ? '' : ' off'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={user.phone ? 'M20 6 9 17l-5-5' : 'M12 5v14M5 12h14'}/></svg>
          טלפון מאומת
        </span>
        <span className="vbadge off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>ת״ז מאומתת</span>
        <span className="vbadge off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>אימות כתובת</span>
      </div>
    </div>
  );
}
