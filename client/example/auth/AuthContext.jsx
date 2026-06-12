import { createContext, useContext, useState } from 'react';
import useUsers from '../hooks/useUsers';
import useLocalStorage from '../hooks/useLocalStorage';
import useApi from '../hooks/useApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage('user', null);
  const { createUser } = useUsers();
  const { apiCall, execute, loading } = useApi();

  const login = async (username, password) => {
    const foundUser = await execute(() =>
      apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
    );
    setUser(foundUser);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const register = async (userData) => {
    const savedUser = await createUser(userData);
    setUser(savedUser);
    return true;
  };

  const updateUserData = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    login, logout, register, updateUserData,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside an AuthProvider');
  return context;
};
