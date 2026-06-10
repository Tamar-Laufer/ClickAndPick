import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';

/* ============================================================
   Onboarding — first-run walkthrough for גמ"ח-נט
   Drop this file + Onboarding.css into client/src/pages/
   Wire it up in App.jsx (see notes at the bottom of this file).
   ============================================================ */

/* ── marked photo placeholder — swap for a real <img className="ob-photo" …/> ── */
function Placeholder({ label, tall }) {
  return (
    <div className={'ob-ph' + (tall ? ' ob-ph--tall' : '')} role="img" aria-label={label}>
      <svg className="ob-ph-icon" width="30" height="30" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
      </svg>
      <span className="ob-ph-label">{label}</span>
    </div>
  );
}

function StarRow({ value = 4.9, count = 234 }) {
  return (
    <div className="ob-stars">
      <div className="ob-stars-icons" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => (
          <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" />
          </svg>
        ))}
      </div>
      <span className="ob-stars-val">{value}</span>
      <span className="ob-stars-count">· {count} ביקורות</span>
    </div>
  );
}

function VBadge({ label }) {
  return (
    <div className="ob-vbadge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      {label}
    </div>
  );
}

function TrustCard() {
  const pct = 98, R = 30, C = 2 * Math.PI * R;
  return (
    <div className="ob-trust">
      <div className="ob-trust-head">
        <div className="ob-avatar" aria-hidden="true">ש</div>
        <div className="ob-trust-id">
          <div className="ob-trust-name">
            שרה א.
            <svg className="ob-verified" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-label="מאומת">
              <path d="M12 1l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16.6l.9-2.9-.9-2.9L5.6 9l1-2.8 3-.1z" />
              <path d="M16.5 9.5 11 15l-2.8-2.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="ob-trust-sub">גמ"ח שמחות · ירושלים</div>
        </div>
        <div className="ob-trust-ring">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={R} fill="none" stroke="var(--ring-track)" strokeWidth="7" />
            <circle cx="38" cy="38" r={R} fill="none" stroke="var(--tone)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 38 38)" className="ob-ring-arc" />
          </svg>
          <div className="ob-trust-pct"><strong>{pct}</strong><span>מד אמון</span></div>
        </div>
      </div>
      <StarRow value={4.9} count={234} />
      <div className="ob-vbadges">
        <VBadge label="ת״ז מאומתת" /><VBadge label="טלפון מאומת" />
        <VBadge label="אימייל מאומת" /><VBadge label="כתובת אומתה" />
      </div>
    </div>
  );
}

const CATS = ['כלי עבודה', 'ציוד לשמחות', 'תחפושות', 'ציוד רפואי', 'גינון', 'אפייה'];
function CatChips() {
  return (
    <div className="ob-chips">
      {CATS.map((c, i) => <span key={i} className={'ob-chip' + (i === 0 ? ' ob-chip--on' : '')}>{c}</span>)}
    </div>
  );
}

const ITEMS = [
  { t: 'מקדחה נטענת', d: '0.4 ק״מ · פנוי' },
  { t: 'מפת אירוח 3מ׳', d: '0.7 ק״מ · פנוי' },
  { t: 'כיסא גלגלים', d: '1.1 ק״מ · פנוי' },
  { t: 'מכונת תפירה', d: '1.4 ק״מ · פנוי' },
];
function ItemWall() {
  return (
    <div className="ob-wall">
      {ITEMS.map((it, i) => (
        <div key={i} className="ob-wall-card">
          <Placeholder label={it.t} />
          <div className="ob-wall-meta"><span className="ob-wall-t">{it.t}</span><span className="ob-wall-d">{it.d}</span></div>
        </div>
      ))}
    </div>
  );
}

const STATS = [
  { n: '12', l: 'פריטים ששאלתם' },
  { n: '₪1,240', l: 'נחסכו השנה' },
  { n: '36 ק״ג', l: 'פסולת שנמנעה' },
  { n: '84 ק״ג', l: 'פליטות CO₂ שנחסכו' },
];
function ImpactGrid() {
  return (
    <div className="ob-impact">
      <div className="ob-impact-grid">
        {STATS.map((s, i) => (
          <div key={i} className="ob-stat"><strong className="ob-stat-n">{s.n}</strong><span className="ob-stat-l">{s.l}</span></div>
        ))}
      </div>
      <div className="ob-impact-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
        ביחד הקהילה כבר חסכה <strong>525 טון</strong> פסולת
      </div>
    </div>
  );
}

function RoleCards({ value, onChange }) {
  const roles = [
    { t: 'אני רוצה לשאול', d: 'מצאו פריטים פנויים לידכם והזמינו בקלות', ic: 'hand' },
    { t: 'אני מנהל/ת גמ"ח', d: 'נהלו את הפריטים והבקשות במקום אחד', ic: 'box' },
  ];
  return (
    <div className="ob-roles">
      {roles.map((r, i) => (
        <button key={i} type="button" className={'ob-role' + (value === i ? ' ob-role--on' : '')} onClick={() => onChange(i)}>
          <span className="ob-role-ic" aria-hidden="true">
            {r.ic === 'hand' ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8 12 3 3 8l9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
              </svg>
            )}
          </span>
          <span className="ob-role-txt"><strong>{r.t}</strong><span>{r.d}</span></span>
          <span className="ob-role-check" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [role, setRole] = useState(0);

  const finish = (to) => {
    try { localStorage.setItem('onboarded', '1'); } catch (e) { /* ignore */ }
    navigate(to);
  };

  const SCREENS = [
    {
      key: 'welcome', tone: 'orange', eyebrow: 'גמ"ח-נט',
      title: <>למה לקנות,<br />כשאפשר <em>לשאול?</em></>,
      body: 'ברוכים הבאים לרשת הגמ"חים של הקהילה. אלפי פריטים להשאלה — ממש מעבר לפינה.',
      media: <Placeholder tall label="שכנים מחליפים פריט בפתח הבית" />,
    },
    {
      key: 'discover', tone: 'teal', eyebrow: 'מגלים',
      title: <>כל מה שצריך,<br />מהשכנים שלכם</>,
      body: 'כלי עבודה, ציוד לשמחות, תחפושות, ציוד רפואי ועוד — מצאו פריטים פנויים לידכם בכמה הקלקות.',
      media: <ItemWall />, extra: <CatChips />,
    },
    {
      key: 'trust', tone: 'teal', eyebrow: 'אמון',
      title: <>קהילה שאפשר<br />לסמוך <em>עליה</em></>,
      body: 'כל חבר/ה עובר/ת אימות, וכל פרופיל נושא מד-אמון שקוף. שואלים בראש שקט.',
      media: <TrustCard />,
    },
    {
      key: 'impact', tone: 'green', eyebrow: 'השפעה',
      title: <>כל השאלה<br />עושה טוב לכולם</>,
      body: 'אנחנו סופרים בשבילכם — כמה חסכתם, כמה פסולת מנעתם וכמה תרמתם לכדור.',
      media: <ImpactGrid />,
    },
    {
      key: 'join', tone: 'orange', eyebrow: 'מתחילים', final: true,
      title: <>מוכנים<br /><em>להצטרף?</em></>,
      body: 'ההרשמה חינמית ולוקחת דקה. בחרו איך תרצו להתחיל.',
      media: <Placeholder tall label="הקהילה שלכם מחכה" />,
      extra: <RoleCards value={role} onChange={setRole} />,
    },
  ];

  const s = SCREENS[i];
  const last = SCREENS.length - 1;
  const go = (n) => { if (n >= 0 && n <= last) setI(n); };

  return (
    <div className={'ob ob--' + s.key} style={{ '--tone': `var(--tone-${s.tone})` }} dir="rtl">
      <header className="ob-top">
        <button type="button" className="ob-icon-btn" aria-label="חזרה" disabled={i === 0} onClick={() => go(i - 1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <div className="ob-progress" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={SCREENS.length}>
          {SCREENS.map((sc, n) => (
            <button key={sc.key} type="button" className={'ob-seg' + (n <= i ? ' ob-seg--on' : '')} aria-label={'מסך ' + (n + 1)} onClick={() => go(n)} />
          ))}
        </div>
        {i < last
          ? <button type="button" className="ob-skip" onClick={() => finish('/')}>דלג</button>
          : <span className="ob-skip ob-skip--ghost" aria-hidden="true">דלג</span>}
      </header>

      <div className="ob-stage">
        <div key={s.key} className="ob-screen">
          <div className="ob-media"><div className="ob-media-inner">{s.media}</div></div>
          <div className="ob-body">
            <div className="ob-body-inner">
              <span className="ob-eyebrow">{s.eyebrow}</span>
              <h2 className="ob-title">{s.title}</h2>
              <p className="ob-lead">{s.body}</p>
              {s.extra && <div className="ob-extra">{s.extra}</div>}
            </div>
          </div>
        </div>
      </div>

      <footer className="ob-actions">
        {!s.final ? (
          <>
            <button type="button" className="ob-cta" onClick={() => go(i + 1)}>
              המשך
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" className="ob-text-link" onClick={() => finish('/login')}>כבר יש לי חשבון</button>
          </>
        ) : (
          <>
            <button type="button" className="ob-cta ob-cta--lg" onClick={() => finish('/register')}>הצטרפות בחינם</button>
            <button type="button" className="ob-text-link" onClick={() => finish('/login')}>כבר רשומים? <strong>התחברו</strong></button>
          </>
        )}
      </footer>
    </div>
  );
}

/* ============================================================
   WIRING — in client/src/App.jsx:

   1) import it:
        import Onboarding from './pages/Onboarding';

   2) add a route (inside <Routes>):
        <Route path="/welcome" element={<Onboarding />} />

   3) (optional) show it on first visit only. Easiest: redirect from
      HomePage if the flag isn't set. At the top of HomePage():
        const navigate = useNavigate();
        useEffect(() => {
          if (!localStorage.getItem('onboarded')) navigate('/welcome');
        }, []);

   The flow itself sets localStorage 'onboarded' = '1' when the
   user finishes, skips, or logs in — so it won't show again.
   ============================================================ */
