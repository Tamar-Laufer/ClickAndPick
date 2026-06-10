import { useEffect } from 'react';

/* ── useFullBleed ──────────────────────────────────────────────────────────
   Pages that carry their own top bar (home, search, item, profile, admin) and
   the auth split-screens render edge-to-edge, so the global fixed-navbar top
   padding on <body> must be dropped while one is mounted and restored on
   unmount. This was an identical inline effect copied into every such page;
   here it lives once. */
export function useFullBleed() {
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);
}
