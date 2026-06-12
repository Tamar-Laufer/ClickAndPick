import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from '../ui/Avatar';
import './TgNavbar.css';

function NavLinks({ active, onNavigate, aboutTo = '/about' }) {
  return (
    <>
      <Link to="/" className={active === 'home' ? 'on' : ''} onClick={onNavigate}>בית</Link>
      <Link to="/search" className={active === 'items' ? 'on' : ''} onClick={onNavigate}>פריטים</Link>
      <Link to="/#process" onClick={onNavigate}>איך זה עובד</Link>
      <Link to={aboutTo} className={active === 'about' ? 'on' : ''} onClick={onNavigate}>עלינו</Link>
    </>
  );
}

function NavActions({ user, onNavigate, onLogout }) {
  if (!user) {
    return (
      <>
        <Link className="tgnav-login" to="/login" onClick={onNavigate}>התחברות</Link>
        <Link className="tgnav-cta" to="/register" onClick={onNavigate}>הצטרפו</Link>
      </>
    );
  }
  return (
    <>
      {user.role === 'ADMIN' && (
        <Link className="tgnav-login" to="/admin" title="לוח ניהול" onClick={onNavigate}>ניהול</Link>
      )}
      <Link className="tgnav-user" to="/profile" title="האזור האישי שלי" onClick={onNavigate}>
        <Avatar user={user} name={user.name} size={28} />
        {user.name}
      </Link>
      <Link className="tgnav-cta" to="/items/new" onClick={onNavigate}>+ פרסמו פריט</Link>
      <button className="tgnav-logout" onClick={onLogout}>יציאה</button>
    </>
  );
}

export default function TgNavbar({ variant = 'page', active }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false);

  function handleLogout() {
    closeMenu();
    logout();
    navigate('/');
  }

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 760) setIsMobileMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header className={`tgnav tgnav--${variant}`}>
      <div className="wrap">
        <Link className="tgnav-brand" to="/" onClick={closeMenu}>
          <img className="tgnav-logo" src="/images/logo-trim.png" alt="Click & Pick" />
        </Link>

        <nav className="tgnav-links"><NavLinks active={active} aboutTo="/#manifesto" /></nav>

        <div className="tgnav-right"><NavActions user={user} onLogout={handleLogout} /></div>

        <button
          type="button"
          className={`tgnav-burger${isMobileMenuOpen ? ' open' : ''}`}
          aria-label={isMobileMenuOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="tgnav-drawer"
          onClick={() => setIsMobileMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>

      <div
        className={`tgnav-backdrop${isMobileMenuOpen ? ' show' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      <nav
        id="tgnav-drawer"
        className={`tgnav-drawer${isMobileMenuOpen ? ' open' : ''}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="tgnav-drawer-links"><NavLinks active={active} onNavigate={closeMenu} /></div>
        <div className="tgnav-drawer-actions"><NavActions user={user} onNavigate={closeMenu} onLogout={handleLogout} /></div>
      </nav>
    </header>
  );
}
