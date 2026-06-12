import { useState } from 'react';
import ChevronIcon from './ChevronIcon';

/* ── Accordion ─────────────────────────────────────────────────────────────
   A single collapsible row: a header button that toggles its body open/closed.
   Styling (.acc-item / .acc-head / .acc-body) is provided by the host page. */
export default function Accordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`acc-item${open ? ' open' : ''}`}>
      <button className="acc-head" type="button" onClick={() => setOpen(o => !o)}>
        {title}<ChevronIcon />
      </button>
      <div className="acc-body"><div className="acc-body-inner">{children}</div></div>
    </div>
  );
}
