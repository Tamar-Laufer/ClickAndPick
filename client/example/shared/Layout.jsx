import { useState } from 'react';
import Header     from './Header';
import Navigation from './Navigation';
import UserInfo   from './UserInfo';

const Layout = ({ children }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="layout-container">
      <Header />
      <Navigation onInfoClick={() => setShowInfo(true)} />
      <div className="main-content">{children}</div>
      <UserInfo isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
};

export default Layout;
