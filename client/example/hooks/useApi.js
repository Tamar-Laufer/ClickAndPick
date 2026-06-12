import { useState } from 'react';

const BASE_URL = 'http://localhost:3001';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!response.ok) {
      let message = `Error: ${response.status}`;
      try { const data = await response.json(); if (data.message) message = data.message; } catch {}
      throw new Error(message);
    }
    return await response.json();
  };

  const execute = async (apiFunction) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { apiCall, execute, loading, error };
};

export default useApi;
