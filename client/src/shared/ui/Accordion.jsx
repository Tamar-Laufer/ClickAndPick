import { useState } from 'react';
import ChevronIcon from './ChevronIcon';

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
