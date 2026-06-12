import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

// Hook layer over the single shared fetch implementation (apiFetch). It injects
// the auth token from context (so callers never thread it) and adds shared
// loading/error via execute(). Use this for mutations in event handlers; for
// data fetches inside effects prefer the stable apiFetch directly.
const useApi = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // one authenticated request — delegates to apiFetch, the one fetch impl
  const apiCall = (endpoint, options = {}) => apiFetch(endpoint, options, token);

  const execute = async (apiFunction) => {
    setError('');
    setLoading(true);
    try {
      return await apiFunction();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { apiCall, execute, loading, error, setError };
};

export default useApi;
