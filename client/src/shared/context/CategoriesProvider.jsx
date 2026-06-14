import { useMemo } from 'react';
import useCategoriesData from '../hooks/useCategoriesData';
import { CategoriesContext } from './CategoriesContext';

export function CategoriesProvider({ children }) {
  const { categories, loading, addCategory } = useCategoriesData();

  const value = useMemo(() => {
    const byValue = new Map(categories.map((c) => [c.value, c]));
    return {
      categories,
      loading,
      addCategory,
      labelOf: (v) => v || '',
      colorOf: (v) => byValue.get(v)?.color || 'coral',
    };
  }, [categories, loading, addCategory]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}
