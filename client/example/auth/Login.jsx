import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameRef = useRef();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => { usernameRef.current?.focus(); }, []);
  useEffect(() => { if (isAuthenticated) navigate('/home'); }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('All fields must be filled in'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand">
        <div className="login-brand__logo"><span>Nexus</span>Hub</div>
        <h2 className="login-brand__heading">
          Your workspace,<br /><em>all in one place.</em>
        </h2>
        <p className="login-brand__desc">
          Manage your tasks, write posts, and connect with your team — from a single, unified dashboard.
        </p>
        <div className="login-brand__features">
          <div className="login-brand__feature">
            <div className="login-brand__feature-dot" />
            Track and manage your daily todos
          </div>
          <div className="login-brand__feature">
            <div className="login-brand__feature-dot" />
            Write and share posts with your team
          </div>
          <div className="login-brand__feature">
            <div className="login-brand__feature-dot" />
            Comment, collaborate, and stay updated
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <h1 className="login-title">Log in</h1>
          <p className="login-subtitle">Welcome back — enter your credentials to continue.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input ref={usernameRef} type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input" placeholder="Enter username" disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input" placeholder="Enter password" disabled={loading} />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="register-link-container">
              <span className="register-link-text">Don't have an account? </span>
              <Link to="/register" className="register-link">Create one</Link>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

export default Login;