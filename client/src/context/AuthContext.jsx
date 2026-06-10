import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// add a convenience display `name` from firstName/lastName (new API shape)
function withDisplayName(u) {
  if (!u) return u;
  const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { ...u, name };
}

// Read any persisted session synchronously, before the first render. Doing this
// here (instead of in a mount effect that called setState) avoids both the
// logged-out → logged-in flash and the extra post-mount render.
function readStoredSession() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) return { token, user: JSON.parse(user) };
  } catch { /* malformed storage → treat as logged out */ }
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  const [stored] = useState(readStoredSession);
  const [user, setUser] = useState(stored.user);
  const [token, setToken] = useState(stored.token);

  function login(userData, jwtToken) {
    const u = withDisplayName(userData);
    setUser(u);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(u));
  }

  function updateUser(userData) {
    const merged = withDisplayName({ ...user, ...userData });
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function isRole(...roles) {
    return user && roles.includes(user.role);
  }

  return (
    // `loading` is retained for API compatibility (ProtectedRoute reads it), but
    // the session is now resolved synchronously, so it is always false.
    <AuthContext.Provider value={{ user, token, loading: false, login, logout, updateUser, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth חייב להיות בתוך AuthProvider');
  return ctx;
}
