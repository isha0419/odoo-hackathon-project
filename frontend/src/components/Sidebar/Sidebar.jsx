import { NavLink } from 'react-router-dom';
import './Sidebar.css';

// Order and labels match the mockup exactly. Path is the route each
// page is mounted at in AppRoutes.jsx — keep these two files in sync.
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Organization setup', path: '/organization' },
  { label: 'Assets', path: '/assets' },
  { label: 'Allocation & Transfer', path: '/allocation' },
  { label: 'Resource Booking', path: '/booking' },
  { label: 'Maintenance', path: '/maintenance' },
  { label: 'Audit', path: '/audit' },
  { label: 'Reports', path: '/reports' },
  { label: 'Notifications', path: '/notifications' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}