import { Link } from 'react-router-dom';
import { useFullBleed } from '../hooks/useFullBleed';
import TgNavbar from '../components/layout/TgNavbar';
import MailForm from '../components/mail/MailForm';
import { apiFetch } from '../services/api';
import './HomePage.css';

/* ── "עלינו" — the manifesto ("הרעיון") lives here now, reached only from the
   navbar. It used to be a homepage section but was moved off to keep the
   landing page lean and app-like. Styling is reused from HomePage.css
   (`.manifesto`, `.cta`) under the shared `.tg` namespace. */

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
);

export default function AboutPage() {
  useFullBleed(); // full-bleed page — this page has its own sticky nav

  // The page (not the component) owns the actual delivery, so MailForm stays a
  // pure, reusable UI piece. Routes through the existing feedback/email pipeline.
  const sendMail = ({ name, email, subject, message }) =>
    apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        type: 'question',
        message: subject ? `[${subject}] ${message}` : message,
      }),
    });

  return (
    <div className="tg tg-white" dir="rtl">
      <TgNavbar variant="page" active="about" />

      {/* ════════ MANIFESTO (הרעיון) ════════ */}
      <section className="manifesto" id="manifesto">
        <div className="wrap">
          <span className="kicker"><span className="idx">01</span> הרעיון</span>
          <h2>את רוב הדברים שאנחנו קונים אנחנו צריכים לכמה ימים בלבד. ביחד מחברת בין שכנים כדי לשתף</h2>
          <div className="manifesto-foot">
            <p>{'זוכרים את התחושה של פעם, כשהיינו פשוט דופקים על הדלת של השכנים כדי לבקש מברגה, אוהל או תבנית אפייה מיוחדת? אנחנו מאמינים שהכוח האמיתי של השכונה שלנו נמצא ממש כאן, בידיים של כולנו. האתר הזה נולד מתוך אמונה פשוטה – להחזיר את הערבות ההדדית למרכז ולהפוך את השיתוף לדרך חיים.\n\nבמקום שכל אחד מאיתנו יקנה, יתחזק ויאחסן ציוד יקר שצובר אבק ויוצא מהארון אולי פעם בשנה, אנחנו מזמינים אתכם לפתוח את הדלתות. הפלטפורמה שלנו נועדה לחבר בינינו בגובה העיניים: ראיתם משהו שאתם צריכים? בלחיצת כפתור אחת, בקשת ההשאלה שלכם מגיעה ישירות לשכן או לשכנה שישמחו לעזור, בלי מסכים מיותרים ובלי מתווכים בדרך.\n\nזה הרבה מעבר לחיסכון בכסף או צמצום קניות. זו ההזדמנות של כולנו להכיר קצת יותר טוב את האנשים שחיים סביבנו, להושיט יד כשצריך, וליצור סביבה שבה לאף אחד לא חסר דבר – כי אנחנו פשוט חולקים את השפע הקיים. ביחד, אנחנו הופכים את הקהילה שלנו לחזקה, אכפתית ועצמאית הרבה יותר.'}</p>
            <Link className="arrow-link" to="/register">הצטרפו לקהילה<ArrowIcon /></Link>
          </div>
        </div>
      </section>

      {/* ════════ CONTACT (mail) ════════ */}
      <section className="manifesto" id="contact">
        <div className="wrap">
          <span className="kicker"><span className="idx">02</span> צרו קשר</span>
          <MailForm onSend={sendMail} />
        </div>
      </section>

      {/* ════════ CTA BAND ════════ */}
      <section className="cta" id="cta">
        <div className="wrap">
          <span className="kicker"><span className="idx">03</span> מצטרפים</span>
          <h2>הקהילה שלכם מחכה.</h2>
          <div className="cta-actions">
            <Link className="btn btn-accent" to="/register">הצטרפות בחינם</Link>
            <Link className="btn btn-line on-dark" to="/login">כבר רשומים? התחברו</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
