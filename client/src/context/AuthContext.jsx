import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// add a convenience display `name` from firstName/lastName (new API shape)
function withDisplayName(u) {
  if (!u) return u;
  const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { ...u, name };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // טעינה מ-localStorage בעת אתחול
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

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
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth חייב להיות בתוך AuthProvider');
  return ctx;
}
