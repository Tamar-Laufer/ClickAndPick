import { useState } from 'react';

const useAsyncAction = (action) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (...args) => {
    setError('');
    setLoading(true);
    try {
      return await action(...args);
    } catch (err) {
      setError(err.message || 'אירעה שגיאה');
    } finally {
      setLoading(false);
    }
  };

  return { run, loading, error, setError };
};

export default useAsyncAction;
