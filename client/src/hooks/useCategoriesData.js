import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../services/api';
import { CATEGORIES as STATIC_FALLBACK } from '../config/categories';

/* ── useCategoriesData ─────────────────────────────────────────────────────
   Owns the *data* side of categories (fetch + cache + reconcile) so the
   Provider is left with nothing but wiring to context. Implements a
   stale-while-revalidate / optimistic load:

     1. Initial paint  — return the last-known list from localStorage, falling
        back to the static seed. Never empty, never a spinner.
     2. Background sync — fetch GET /categories on mount, no UI block.
     3. Reconcile       — on success, normalise + persist + swap state, but only
        if the data actually changed (see `signature`), so a sync that returns
        the same list never forces a re-render while the user is mid-interaction
        with the list (e.g. picking filters).
     4. Failure         — keep the active data, log in dev only. No spinner.   */

const CACHE_KEY = 'cp.categories.v1';

/* Defend the UI against malformed/legacy category docs. The catalog filter and
   item forms key off `value`/`label`/`color`; a row missing those (e.g. an old
   record that only had `name`) would otherwise render as a blank, broken option.
   So we: map a legacy `name` → value/label, drop anything still without both,
   default the colour, and dedupe by `value` (last wins). */
function normalize(list) {
  const byValue = new Map();
  for (const c of list) {
    const value = String(c.value ?? c.name ?? '').trim();
    const label = String(c.label ?? c.name ?? '').trim();
    if (!value || !label) continue;
    byValue.set(value, { ...c, value, label, color: c.color || 'coral' });
  }
  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label, 'he'));
}

/* cheap content fingerprint — lets us skip a no-op state swap when the server
   returns data identical to what's already rendered. */
const signature = (list) => list.map((c) => `${c.value}|${c.label}|${c.color}`).join(';');

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
    return Array.isArray(parsed) && parsed.length ? normalize(parsed) : null;
  } catch {
    return null; // unparseable / unavailable (private mode) → fall through to seed
  }
}

function writeCache(list) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode — caching is best-effort, the app still works */
  }
}

export function useCategoriesData() {
  // initial paint: last-known cache → static seed. Guaranteed non-empty.
  const [categories, setCategories] = useState(() => readCache() ?? STATIC_FALLBACK);
  const [loading, setLoading] = useState(true);

  // signature of what's currently on screen, so applyFresh can skip no-op swaps
  const sigRef = useRef(null);
  if (sigRef.current === null) sigRef.current = signature(categories);

  // normalise + persist incoming data, swap state only when it actually differs
  const applyFresh = useCallback((list) => {
    const next = normalize(list);
    writeCache(next);
    const sig = signature(next);
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      setCategories(next);
    }
  }, []);

  // background sync on mount; `alive` guards against a late resolve after unmount
  useEffect(() => {
    let alive = true;
    apiFetch('/categories')
      .then((d) => { if (alive && d.categories?.length) applyFresh(d.categories); })
      .catch((err) => { if (import.meta.env.DEV) console.warn('categories sync failed', err); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [applyFresh]);

  // push a newly created category into the shared list (and cache) so it appears
  // site-wide without a reload — re-normalised so a dupe value can't sneak in.
  const addCategory = useCallback((cat) => {
    setCategories((prev) => {
      const next = normalize([...prev, cat]);
      writeCache(next);
      sigRef.current = signature(next);
      return next;
    });
  }, []);

  return { categories, loading, addCategory };
}
