import { useMemo } from 'react';
import { useCategoriesData } from '../hooks/useCategoriesData';
import { CategoriesContext } from './CategoriesContext';

/* Categories are admin-managed (GET /api/categories). This provider shares one
   fetched-and-cached copy with every consumer — forms, search filters and
   item-card labels — so a newly added category appears everywhere without a
   per-component fetch.

   All data work (initial cache load, background sync, reconciliation, failure
   handling) lives in useCategoriesData(); the provider only adapts that into
   the context value + the label/colour lookup helpers consumers use. */
export function CategoriesProvider({ children }) {
  const { categories, loading, addCategory } = useCategoriesData();

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
  }, [categories, loading, addCategory]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}
