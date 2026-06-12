import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">
          <button onClick={() => navigate('/home')}><span>Nexus</span>Hub</button>
        </h1>
        <div className="header-user-info">
          Logged in as: <strong>{user?.username}</strong>
        </div>
      </div>
    </header>
  );
};

export default Header;
