import { useMemo, useState } from 'react';
import './AvailabilityCalendar.css';


const DAY_MS = 86400000;
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const toKey = (d) => {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export default function AvailabilityCalendar({ bookedRanges = [], value, onChange }) {
  const today = startOfDay(new Date());
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

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

  function rangeHasConflict(a, b) {
    let d = new Date(a.getTime() + DAY_MS);
    while (d < b) { if (isDisabled(d)) return true; d = new Date(d.getTime() + DAY_MS); }
    return false;
  }

  function pick(day) {
    if (isDisabled(day)) return;
    if (!sel.start || sel.end || day < sel.start) {
      onChange({ startDate: toKey(day), endDate: '' });
      return;
    }
    if (rangeHasConflict(sel.start, day)) {
      onChange({ startDate: toKey(day), endDate: '' });
      return;
    }
    onChange({ startDate: toKey(sel.start), endDate: toKey(day) });
  }

  function inRange(d) {
    if (!sel.start || !sel.end) return false;
    return d > sel.start && d < sel.end;
  }

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
