import { Link } from 'react-router-dom';
import { priceParts } from '../../../shared/utils/format';
import useHomePage from '../hooks/useHomePage';
import TgNavbar from '../../../shared/layout/TgNavbar';
import FeedbackForm from '../../feedback/components/FeedbackForm';
import Marquee from '../../../shared/ui/Marquee';
import Avatar from '../../../shared/ui/Avatar';
import './HomePage.css';

const hideBrokenImg = (e) => { e.currentTarget.style.display = 'none'; };

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'מודיעין', 'רעננה', 'הרצליה', 'גבעתיים'];

const STATS = [
  { n: '5,200', u: '+',     suffix: false, label: 'פריטים שותפו' },
  { n: '1,800', u: null,    suffix: false, label: 'שכנים פעילים' },
  { n: '240K',  u: '₪',     suffix: false, label: 'נחסכו לקהילה' },
  { n: '12',    u: ' טון',  suffix: true,  label: 'פסולת שנמנעה' },
];

const STEPS = [
  {
    n: '01', title: 'מחפשים', desc: 'מצאו פריט פנוי מבין אלפי פריטים שהשכנים משתפים — לפי קטגוריה או מרחק.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  },
  {
    n: '02', title: 'מבקשים', desc: 'שלחו בקשת השאלה בלחיצה אחת, וקבעו עם השכן זמן איסוף שנוח לשניכם.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.1A8.38 8.38 0 1 1 21 11.5z" /></svg>,
  },
  {
    n: '03', title: 'אוספים', desc: 'אספו את הפריט מהשכן הקרוב — ברוב המקרים ממש מעבר לפינה מהבית.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  },
  {
    n: '04', title: 'מחזירים', desc: 'סיימתם? החזירו את הפריט נקי — חסכתם כסף ומקום, ועזרתם לקהילה.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>,
  },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
);

const HomePage = () => {
  const { rootRef, user, labelOf, items, reviews } = useHomePage();

  return (
    <div className="tg" dir="rtl" ref={rootRef}>

      {/* ════════ NAVBAR ════════ */}
      <TgNavbar variant="home" active="home" />

      {/* ════════ HERO ════════ */}
      <header className="hero" id="top">
        <div className="hero-media" />
        <div className="wrap">
          <span className="kicker hero-kicker"><span className="idx">01</span> קהילת השיתוף השכונתית</span>
          <h1>הופכים שיתוף. לדרך חיים.</h1>
          <div className="hero-foot">
            <div>
              <p className="hero-lead">{'אנחנו חולמים על עולם ללא פסולת\nמיליארד פעולות קטנות הכניסו אותנו לבלגן הזה. מיליארד פעולות קטנות יכולות להוציא אותנו ממנו.'}</p>
              <div className="hero-actions">
                {!user && <Link className="btn btn-accent" to="/register">הצטרפו בחינם</Link>}
                <a className="btn btn-line on-dark" href="#process">איך זה עובד</a>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">גלילה</div>
      </header>

      {/* ════════ MARQUEE STRIP (desktop only) ════════ */}
      <section className="strip tg-section--lg">
        <div className="wrap">
          <span className="strip-label">פעילים בשכונות ברחבי הארץ</span>
          <Marquee
            items={CITIES}
            speed={55}
            gap={0}
            className="strip-marquee"
            ariaLabel="שכונות פעילות ברחבי הארץ"
            renderItem={(c) => <span className="strip-city">{c}<i /></span>}
          />
        </div>
      </section>

      {/* ════════ MANIFESTO (desktop only — also lives on /about) ════════ */}
      <section className="manifesto tg-section--lg" id="manifesto">
        <div className="wrap">
          <span className="kicker" data-reveal><span className="idx">02</span> הרעיון</span>
          <h2 data-reveal data-delay="1">את רוב הדברים שאנחנו קונים אנחנו צריכים לכמה ימים בלבד. ביחד מחברת בין שכנים כדי לשתף</h2>
          <div className="manifesto-foot">
            <p data-reveal>{'זוכרים את התחושה של פעם, כשהיינו פשוט דופקים על הדלת של השכנים כדי לבקש מברגה, אוהל או תבנית אפייה מיוחדת? אנחנו מאמינים שהכוח האמיתי של השכונה שלנו נמצא ממש כאן, בידיים של כולנו. האתר הזה נולד מתוך אמונה פשוטה – להחזיר את הערבות ההדדית למרכז ולהפוך את השיתוף לדרך חיים.\n\nבמקום שכל אחד מאיתנו יקנה, יתחזק ויאחסן ציוד יקר שצובר אבק ויוצא מהארון אולי פעם בשנה, אנחנו מזמינים אתכם לפתוח את הדלתות. הפלטפורמה שלנו נועדה לחבר בינינו בגובה העיניים: ראיתם משהו שאתם צריכים? בלחיצת כפתור אחת, בקשת ההשאלה שלכם מגיעה ישירות לשכן או לשכנה שישמחו לעזור, בלי מסכים מיותרים ובלי מתווכים בדרך.\n\nזה הרבה מעבר לחיסכון בכסף או צמצום קניות. זו ההזדמנות של כולנו להכיר קצת יותר טוב את האנשים שחיים סביבנו, להושיט יד כשצריך, וליצור סביבה שבה לאף אחד לא חסר דבר – כי אנחנו פשוט חולקים את השפע הקיים. ביחד, אנחנו הופכים את הקהילה שלנו לחזקה, אכפתית ועצמאית הרבה יותר.'}</p>
            <Link className="arrow-link" to="/register" data-reveal data-delay="1">קראו את הסיפור שלנו<ArrowIcon /></Link>
          </div>
        </div>
      </section>

      {/* ════════ CATEGORIES ════════ */}
      <section className="cats" id="cats">
        <div className="wrap">
          <div className="cats-head">
            <h2 data-reveal>הפריטים שלנו</h2>
            <Link className="arrow-link" to="/search" data-reveal data-delay="1">לכל הפריטים<ArrowIcon /></Link>
          </div>
        </div>
        {items.length > 0 && (
          <Marquee
            items={items}
            speed={55}
            gap={22}
            ariaLabel="פריטים זמינים בקהילה"
            renderItem={(it) => {
              const price = priceParts(it);
              const img = it.imageUrl || null;
              return (
                <Link className="pcard" to={`/item/${it.id}`}>
                  <div className="pcard-media">
                    {img
                      ? <img src={img} alt={it.title} loading="lazy" onError={hideBrokenImg} />
                      : <div className="pcard-ph">{it.title ? it.title[0] : '?'}</div>}
                    {it.category && <span className="pcard-tag">{labelOf(it.category)}</span>}
                  </div>
                  <div className="pcard-body">
                    <span className="pcard-name">{it.title}</span>
                    <span className="pcard-price">{price.main}{price.unit && <span> {price.unit}</span>}</span>
                  </div>
                </Link>
              );
            }}
          />
        )}
      </section>

      {/* ════════ SHOWCASE + STATS (desktop only) ════════ */}
      <section className="showcase tg-section--lg">
        <div className="showcase-img">
          <img className="showcase-photo" src="/images/hands.png" alt="ידיים משתפות כלים בקהילה" loading="lazy" onError={hideBrokenImg} />
          <div className="showcase-cap">
            <span className="kicker"><span className="idx">04</span> הקהילה</span>
            <p>אלפי שכנים שכבר גילו שכשמשתפים — כולם מרוויחים.</p>
          </div>
        </div>
        <div className="stats">
          <div className="wrap">
            {STATS.map((s, i) => (
              <div className="stat" key={i}>
                <div className="stat-n">
                  {s.suffix ? <>{s.n}<span className="u">{s.u}</span></> : <>{s.u && <span className="u">{s.u}</span>}{s.n}</>}
                </div>
                <div className="stat-l">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PROCESS (dark) ════════ */}
      <section className="process" id="process">
        <div className="wrap">
          <div className="process-head">
            <div>
              <span className="kicker"><span className="idx">05</span> איך זה עובד</span>
              <h2>ארבעה צעדים פשוטים<br />מהבקשה ועד ההחזרה</h2>
            </div>
            {!user && <Link className="btn btn-accent" to="/register">הצטרפו עכשיו</Link>}
          </div>
          <div className="process-steps">
            {STEPS.map((s, i) => (
              <div className="step" key={s.n} data-reveal data-delay={i}>
                <div className="step-n">{s.n}</div>
                <div className="step-ic">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ REVIEWS — desktop only, and only once recommendations are approved ════════ */}
      {reviews.length > 0 && (
        <section className="reviews tg-section--lg">
          <div className="wrap">
            <span className="kicker">מהקהילה</span>
            <h2 className="reviews-title">מה אומרים השכנים</h2>
          </div>
          <Marquee
            items={reviews}
            speed={45}
            gap={20}
            reverse
            ariaLabel="המלצות מהקהילה"
            renderItem={(r) => (
              <div className="rcard">
                <p className="rcard-text">"{r.text}"</p>
                <div className="rcard-by">
                  <Avatar user={{ avatarUrl: r.avatarUrl }} name={r.name} size={40} className="rcard-av" />
                  <span className="rcard-by-txt">
                    <span className="rcard-name">{r.name}</span>
                    <span className="rcard-role">חבר/ת קהילה</span>
                  </span>
                </div>
              </div>
            )}
          />
        </section>
      )}

      {/* ════════ CTA BAND — a "join the community" band, only for guests ════════ */}
      {!user && (
        <section className="cta" id="cta">
          <div className="wrap">
            <span className="kicker"><span className="idx">06</span> מצטרפים</span>
            <h2>הקהילה שלכם מחכה.</h2>
            <div className="cta-actions">
              <Link className="btn btn-accent" to="/register">הצטרפות בחינם</Link>
              <Link className="btn btn-line on-dark" to="/login">כבר רשומים? התחברו</Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════ FOOTER ════════ */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-brand">
              <Link className="brand" to="/">
                <img className="brand-logo" src="/images/logo-light.png" alt="Click & Pick" />
              </Link>
              <p className="footer-tag">פלטפורמת השיתוף השכונתית. שואלים מהשכנים, חוסכים כסף, ובונים קהילה — פריט אחר פריט.</p>
            </div>
            <div className="footer-cols">
              <div className="footer-col">
                <h4>הפלטפורמה</h4>
                <a href="#process">איך זה עובד</a><a href="#cats">קטגוריות</a><Link to="/TermsPage">אמון ובטיחות</Link>
              </div>
              <div className="footer-col">
                <h4>קהילה</h4>
                <a href="#FeedbackForm">צור קשר</a>
              </div>
            </div>
            <section id="FeedbackForm">
              <FeedbackForm />
            </section>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Click&Pick · כל הזכויות שמורות</span>
            <div className="footer-social">
              <a href="#" aria-label="פייסבוק"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg></a>
              <a href="#" aria-label="אינסטגרם"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="0" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg></a>
              <a href="#" aria-label="טוויטר"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
