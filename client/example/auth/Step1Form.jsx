import { useState, useRef, useEffect } from 'react';
import useUsers from '../hooks/useUsers';

const Step1Form = ({ formData, updateField, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const usernameRef = useRef();
  const { fetchUsers } = useUsers();

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { username, password, verifyPassword } = formData;
    if (!username.trim()) return setError('Username required');
    if (username.length < 3) return setError('Username must contain at least 3 characters');
    if (!password.trim()) return setError('Password required');
    if (password.length < 4) return setError('Password must contain at least 4 characters');
    if (password !== verifyPassword) return setError('The passwords do not match');

    setLoading(true);
    try {
      const users = await fetchUsers();
      if (users.find(u => u.username === username)) {
        setError('Username already exists');
        return;
      }
      onNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Username:</label>
        <input ref={usernameRef} type="text" value={formData.username} onChange={(e) => updateField('username', e.target.value)} className="form-input" placeholder="Enter username" />
      </div>
      <div className="form-group">
        <label className="form-label">Password:</label>
        <input type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} className="form-input" placeholder="Enter password" />
      </div>
      <div className="form-group">
        <label className="form-label">Password Verification:</label>
        <input type="password" value={formData.verifyPassword} onChange={(e) => updateField('verifyPassword', e.target.value)} className="form-input" placeholder="Enter password again" />
      </div>
      {error && <div className="error-message">{error}</div>}
      <button type="submit" disabled={loading} className="submit-button primary">{loading ? 'Checking...' : 'Continue to Next Step'}</button>
    </form>
  );
};

export default Step1Form;