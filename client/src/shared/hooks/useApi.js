import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const useApi = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
