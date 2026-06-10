/* flow.jsx — OnboardingFlow: responsive RTL onboarding carousel chrome.
   Renders window.OB.SCREENS with progress, back/skip, animated transitions,
   and per-screen CTA. Exports window.OnboardingFlow. */

const { useState: useFlowState, useRef: useFlowRef } = React;

function OnboardingFlow({ start = 0, instanceId = "main" }) {
  const SCREENS = window.OB.SCREENS;
  const [i, setI] = useFlowState(start);
  const [dir, setDir] = useFlowState(1);     // 1 = forward, -1 = back
  const [done, setDone] = useFlowState(false);
  const s = SCREENS[i];
  const last = SCREENS.length - 1;

  function go(next) {
    if (next < 0 || next > last) return;
    setDir(next > i ? 1 : -1);
    setI(next);
  }

  const tone = `var(--tone-${s.tone})`;

  return (
    <div className={"ob ob--" + s.key} style={{ "--tone": tone }} data-screen-label={s.key} dir="rtl">

      {/* ── top chrome ── */}
      <header className="ob-top">
        <button type="button" className="ob-icon-btn" aria-label="חזרה"
                disabled={i === 0} onClick={() => go(i - 1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <div className="ob-progress" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={SCREENS.length}>
          {SCREENS.map((sc, n) => (
            <button key={sc.key} type="button" className={"ob-seg" + (n <= i ? " ob-seg--on" : "")}
                    aria-label={"מסך " + (n + 1)} onClick={() => go(n)} />
          ))}
        </div>

        {i < last
          ? <button type="button" className="ob-skip" onClick={() => go(last)}>דלג</button>
          : <span className="ob-skip ob-skip--ghost" aria-hidden="true">דלג</span>}
      </header>

      {/* ── stage ── */}
      <div className="ob-stage">
        <div key={s.key} className={"ob-screen" + (s.hero ? " ob-screen--hero" : "")}
             data-dir={dir}>
          <div className="ob-media">
            <div className="ob-media-inner">{s.media()}</div>
          </div>
          <div className="ob-body">
            <div className="ob-body-inner">
              <span className="ob-eyebrow">{s.eyebrow}</span>
              <h2 className="ob-title">{s.title}</h2>
              <p className="ob-lead">{s.body}</p>
              {s.extra && <div className="ob-extra">{s.extra()}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── bottom actions ── */}
      <footer className="ob-actions">
        {!s.final ? (
          <>
            <button type="button" className="ob-cta" onClick={() => go(i + 1)}>
              המשך
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <a className="ob-text-link" href="#" onClick={(e) => { e.preventDefault(); go(last); }}>
              כבר יש לי חשבון
            </a>
          </>
        ) : (
          <>
            <button type="button" className={"ob-cta ob-cta--lg" + (done ? " ob-cta--done" : "")}
                    onClick={() => setDone(true)}>
              {done ? "ברוכים הבאים! ✓" : "הצטרפות בחינם"}
            </button>
            <a className="ob-text-link" href="#" onClick={(e) => e.preventDefault()}>
              כבר רשומים? <strong>התחברו</strong>
            </a>
          </>
        )}
      </footer>
    </div>
  );
}

window.OnboardingFlow = OnboardingFlow;
