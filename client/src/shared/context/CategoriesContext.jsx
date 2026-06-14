import { createContext, useContext } from 'react';

export const CategoriesContext = createContext(null);

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories חייב להיות בתוך CategoriesProvider');
  return ctx;
}
