import { useState } from 'react';
import { AuthContext } from './AuthContext';
import { fullName } from '../utils/format';

// add a convenience display `name` from firstName/lastName (new API shape)
function withDisplayName(u) {
  if (!u) return u;
  const name = u.name || fullName(u);
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
    <AuthContext.Provider value={{ user, token, loading: false, login, logout, updateUser, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}
