import { useEffect } from 'react';

/* ── useAuthLayout ─────────────────────────────────────────────────────────
   Auth screens use a full-bleed split layout, so the global fixed-navbar top
   padding must be dropped while one is mounted (and restored on unmount). */
export function useAuthLayout() {
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);
}
