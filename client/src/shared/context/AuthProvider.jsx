import { useState } from 'react';
import { AuthContext } from './AuthContext';
import { fullName } from '../utils/format';

function withDisplayName(u) {
  if (!u) return u;
  const name = u.name || fullName(u);
  return { ...u, name };
}

function readStoredSession() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) return { token, user: JSON.parse(user) };
  } catch { }
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
