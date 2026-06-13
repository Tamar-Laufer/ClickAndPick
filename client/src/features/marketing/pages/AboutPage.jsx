import { Link } from 'react-router-dom';
import TgNavbar from '../../../shared/layout/TgNavbar';
import FeedbackForm from '../../feedback/components/FeedbackForm';
import './HomePage.css';

export default function AboutPage() {
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
            <Link className="arrow-link" to="/register">הצטרפו לקהילה</Link>
          </div>
        </div>
      </section>

      {/* ════════ CONTACT (shared feedback form) ════════ */}
      <section className="manifesto">
        <div className="wrap">
          <span className="kicker"><span className="idx">02</span> צרו קשר</span>
          <div className="fc-light"><FeedbackForm /></div>
        </div>
      </section>

      
      {/* <section className="cta" id="cta">
        <div className="wrap">
          <span className="kicker"><span className="idx">03</span> מצטרפים</span>
          <h2>הקהילה שלכם מחכה.</h2>
          <div className="cta-actions">
            <Link className="btn btn-accent" to="/register">הצטרפות בחינם</Link>
            <Link className="btn btn-line on-dark" to="/login">כבר רשומים? התחברו</Link>
          </div>
        </div>
      </section> */}
    </div>
  );
}
