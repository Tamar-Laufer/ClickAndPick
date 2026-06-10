import { createContext, useContext } from 'react';

/* Categories context object + the `useCategories` hook. The Provider lives in
   its own file (CategoriesProvider.jsx) so this module exports no components,
   satisfying React Fast Refresh (react-refresh/only-export-components). */
export const CategoriesContext = createContext(null);

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories חייב להיות בתוך CategoriesProvider');
  return ctx;
}
