import { createContext, useContext } from 'react';

/* Auth context object + the `useAuth` hook. The Provider lives in its own file
   (AuthProvider.jsx) so this module exports no components — that keeps React
   Fast Refresh happy (react-refresh/only-export-components). */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth חייב להיות בתוך AuthProvider');
  return ctx;
}
