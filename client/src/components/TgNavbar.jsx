import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import './TgNavbar.css';

/* One shared navbar for every page.
   variant 'home'  → solid turquoise sticky bar (light hero), dark text
   variant 'page'  → solid white sticky bar, dark text
   Everything else (brand, links, layout) is identical.

   Mobile (≤760px): the horizontal links + right-side actions are hidden behind
   a hamburger button that toggles a full-screen drawer. The drawer closes when
   any link is tapped, when the backdrop is tapped, or on logout. */

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

  /* lock background scroll while the drawer is open, and make sure the menu is
     never left open if the viewport grows back to desktop. */
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    const onResize = () => { if (window.innerWidth > 760) setIsMobileMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', onResize);
    };
  }, [isMobileMenuOpen]);

  /* the nav links + auth actions are rendered twice — once inline for desktop,
     once inside the drawer for mobile — so each context can be styled on its
     own without markup hacks. `onNavigate` lets the drawer copy close on tap. */
  const renderLinks = (onNavigate) => (
    <>
      <Link to="/" className={active === 'home' ? 'on' : ''} onClick={onNavigate}>בית</Link>
      <Link to="/search" className={active === 'items' ? 'on' : ''} onClick={onNavigate}>פריטים</Link>
      <Link to="/#process" onClick={onNavigate}>איך זה עובד</Link>
      <Link to="/about" className={active === 'about' ? 'on' : ''} onClick={onNavigate}>עלינו</Link>
    </>
  );

  const renderActions = (onNavigate) => (
    user ? (
      <>
        {user.role === 'ADMIN' && (
          <Link className="tgnav-login" to="/admin" title="לוח ניהול" onClick={onNavigate}>ניהול</Link>
        )}
        <Link className="tgnav-user" to="/profile" title="האזור האישי שלי" onClick={onNavigate}>
          <Avatar user={user} name={user.name} size={28} />
          {user.name}
        </Link>
        <Link className="tgnav-cta" to="/items/new" onClick={onNavigate}>+ פרסמו פריט</Link>
        <button className="tgnav-logout" onClick={handleLogout}>יציאה</button>
      </>
    ) : (
      <>
        <Link className="tgnav-login" to="/login" onClick={onNavigate}>התחברות</Link>
        <Link className="tgnav-cta" to="/register" onClick={onNavigate}>הצטרפו</Link>
      </>
    )
  );

  return (
    <header className={`tgnav tgnav--${variant}`}>
      <div className="wrap">
        <Link className="tgnav-brand" to="/" onClick={closeMenu}>
          <img className="tgnav-logo" src="/images/logo-trim.png" alt="Click & Pick" />
        </Link>

        {/* desktop horizontal links */}
        <nav className="tgnav-links">{renderLinks()}</nav>

        {/* desktop right-side actions */}
        <div className="tgnav-right">{renderActions()}</div>

        {/* mobile hamburger — bars morph into an ✕ when open */}
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

      {/* mobile drawer + backdrop (only meaningful ≤760px via CSS) */}
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
        <div className="tgnav-drawer-links">{renderLinks(closeMenu)}</div>
        <div className="tgnav-drawer-actions">{renderActions(closeMenu)}</div>
      </nav>
    </header>
  );
}
