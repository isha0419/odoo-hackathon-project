import { useState } from 'react';
import { getCurrentUser, logout } from '../../utils/auth';
import './Navbar.css';

export default function Navbar({ title, onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getCurrentUser();

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button className="navbar__toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 5H16M2 9H16M2 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h2 className="navbar__title">{title}</h2>
      </div>

      <div className="navbar__right">
        <button className="navbar__user" onClick={() => setMenuOpen((o) => !o)}>
          <span className="navbar__avatar">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
          <span className="navbar__username">{user?.name || 'User'}</span>
        </button>

        {menuOpen && (
          <div className="navbar__menu">
            <button onClick={logout}>Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}