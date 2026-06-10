import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../hooks/useApi';
import { CATEGORIES as FALLBACK } from '../config/categories';

/* Categories are admin-managed (GET /api/categories). This provider fetches
   them once and shares them with every consumer — forms, search filters and
   item-card labels — so a newly added category appears everywhere without a
   per-component fetch. Seeded with the static fallback so the first paint is
   populated and the app still works offline / if the API is down. */

const CategoriesContext = createContext(null);

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

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/categories')
      .then((d) => { if (d.categories?.length) setCategories(normalize(d.categories)); })
      .catch(() => {}) // keep the fallback on failure
      .finally(() => setLoading(false));
  }, []);

  // push a newly created category into the shared list so it appears site-wide
  // (item forms, filters, labels) without a reload — re-normalised so a dupe
  // value can't sneak in twice.
  const addCategory = (cat) =>
    setCategories((prev) => normalize([...prev, cat]));

  const value = useMemo(() => {
    const byValue = new Map(categories.map((c) => [c.value, c]));
    return {
      categories,
      loading,
      addCategory,
      // label for a stored value: matched label → raw value → '' (lets callers
      // keep their own generic fallback, e.g. labelOf(x) || 'פריט')
      labelOf: (v) => (v ? byValue.get(v)?.label || v : ''),
      colorOf: (v) => byValue.get(v)?.color || 'coral',
    };
  }, [categories, loading]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories חייב להיות בתוך CategoriesProvider');
  return ctx;
}
