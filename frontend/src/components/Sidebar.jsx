import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../utils/constants';
import { canSeeNavItem } from '../utils/roles';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">AF</span>
        <span>AssetFlow</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.filter((item) => canSeeNavItem(item, user)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-name">{user?.name}</div>
        <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
        <button className="btn btn-ghost btn-sm sidebar-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
