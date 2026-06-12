import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Navigation.css';

const Navigation = ({ onInfoClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.includes(path);

  return (
    <nav className="navigation">
      <div className="navigation-content">
        <button onClick={() => navigate('/home')}
          className={`nav-button ${location.pathname === '/home' ? 'active' : 'normal'}`}>
          Home
        </button>

        <button onClick={onInfoClick} className="nav-button normal">
          Info
        </button>

        <button onClick={() => navigate(`/users/${user.username}/todos`)}
          className={`nav-button ${isActive('/todos') ? 'active' : 'normal'}`}>
          Todos
        </button>

        <button onClick={() => navigate(`/users/${user.username}/posts`)}
          className={`nav-button ${isActive('/posts') ? 'active' : 'normal'}`}>
          Posts
        </button>

        <button onClick={handleLogout} className="nav-button logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
