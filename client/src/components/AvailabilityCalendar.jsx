import { useMemo, useState } from 'react';
import './AvailabilityCalendar.css';

/* ── AvailabilityCalendar ───────────────────────────────────────────────────
   A dependency-free month grid range picker (RTL, Hebrew). It disables:
     • past days, and
     • days falling inside any confirmed booking range (`bookedRanges`),
   and lets the renter pick a start day then an end day. A range that would span
   a booked/disabled day is rejected, so overlapping bookings can't be selected.

   Props:
     bookedRanges : [{ startDate, endDate }]  (ISO strings or Date)
     value        : { startDate, endDate }    (YYYY-MM-DD strings, '' if unset)
     onChange     : (next) => void            (same { startDate, endDate } shape)
   This component is purely presentational about availability — the server is
   still the source of truth and re-checks on booking creation.                  */

const DAY_MS = 86400000;
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/* local-midnight helpers — we compare by calendar day, never by clock time */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const toKey = (d) => {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export default function AvailabilityCalendar({ bookedRanges = [], value, onChange }) {
  const today = startOfDay(new Date());
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // Flatten every booked range into a Set of disabled day-keys. A booking is
  // unavailable on every day from startDate to endDate inclusive (the item is
  // out on the return day too).
  const blocked = useMemo(() => {
    const set = new Set();
    for (const r of bookedRanges) {
      let d = startOfDay(r.startDate);
      const end = startOfDay(r.endDate);
      while (d <= end) { set.add(toKey(d)); d = new Date(d.getTime() + DAY_MS); }
    }
    return set;
  }, [bookedRanges]);

  const sel = {
    start: value?.startDate ? startOfDay(value.startDate) : null,
    end: value?.endDate ? startOfDay(value.endDate) : null,
  };

  const isPast = (d) => d < today;
  const isBlocked = (d) => blocked.has(toKey(d));
  const isDisabled = (d) => isPast(d) || isBlocked(d);

  // Does the inclusive range [a, b] contain any disabled day? Guards against
  // selecting an end date on the far side of a booked block.
  function rangeHasConflict(a, b) {
    let d = new Date(a.getTime() + DAY_MS); // start day itself is already validated
    while (d < b) { if (isDisabled(d)) return true; d = new Date(d.getTime() + DAY_MS); }
    return false;
  }

  function pick(day) {
    if (isDisabled(day)) return;
    // first click, or restarting after a complete range, sets a new start
    if (!sel.start || sel.end || day < sel.start) {
      onChange({ startDate: toKey(day), endDate: '' });
      return;
    }
    // second click sets the end — reject if it jumps over a booked block
    if (rangeHasConflict(sel.start, day)) {
      onChange({ startDate: toKey(day), endDate: '' }); // treat as a fresh start instead
      return;
    }
    onChange({ startDate: toKey(sel.start), endDate: toKey(day) });
  }

  function inRange(d) {
    if (!sel.start || !sel.end) return false;
    return d > sel.start && d < sel.end;
  }

  // Build the 6-week grid for the current view month (leading blanks for offset).
  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < first.getDay(); i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) out.push(new Date(view.getFullYear(), view.getMonth(), day));
    return out;
  }, [view]);

  const canGoPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
  const goPrev = () => canGoPrev && setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const goNext = () => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  return (
    <div className="cal" dir="rtl">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={goPrev} disabled={!canGoPrev} aria-label="חודש קודם">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <span className="cal-month">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
        <button type="button" className="cal-nav" onClick={goNext} aria-label="חודש הבא">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
      </div>

      <div className="cal-grid cal-dow">
        {WEEKDAYS.map(w => <span key={w} className="cal-dow-c">{w}</span>)}
      </div>

      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} className="cal-cell empty" />;
          const disabled = isDisabled(d);
          const isStart = sel.start && d.getTime() === sel.start.getTime();
          const isEnd = sel.end && d.getTime() === sel.end.getTime();
          const cls = [
            'cal-cell',
            disabled ? 'disabled' : '',
            isBlocked(d) && !isPast(d) ? 'booked' : '',
            isStart || isEnd ? 'sel' : '',
            inRange(d) ? 'between' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={toKey(d)}
              type="button"
              className={cls}
              disabled={disabled}
              aria-pressed={isStart || isEnd}
              aria-label={isBlocked(d) ? `${d.getDate()} — תפוס` : `${d.getDate()}`}
              onClick={() => pick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="lg sel" /> נבחר</span>
        <span><i className="lg booked" /> תפוס</span>
      </div>
    </div>
  );
}
