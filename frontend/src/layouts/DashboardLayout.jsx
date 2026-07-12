import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import { isAuthenticated, logout } from '../utils/auth';
import './DashboardLayout.css';

// Single outer framed shell matching the mockup: one rounded border around
// the whole app, "AssetFlow" brand bar on top, sidebar + content below it,
// and a floating "+" toggle in the bottom-left corner.
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-frame">
      <header className="app-frame__brand">
        <span>AssetFlow</span>
        {/* TODO(Yash): swap for a proper user menu once auth/profile data is available */}
        <button className="app-frame__logout" onClick={logout}>
          Log out
        </button>
      </header>

      <div className="app-frame__body">
        {!collapsed && <Sidebar />}
        <main className="app-frame__content">
          <Outlet />
        </main>
      </div>

      <button
        className="app-frame__fab"
        onClick={() => setCollapsed((c) => !c)}
        aria-label="Toggle sidebar"
      >
        +
      </button>
    </div>
  );
}