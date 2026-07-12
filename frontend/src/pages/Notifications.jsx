import { useState, useMemo } from 'react';
import Button from '../components/Button/Button';
import { mockNotifications } from '../data/notifications';
import './Notifications.css';

// Screen 10 — Activity logs & Notifications
// Owner: Isha

const TABS = [
  { name: 'All', className: 'notifications-tab-btn--all' },
  { name: 'Alerts', className: 'notifications-tab-btn--alerts' },
  { name: 'Approvals', className: 'notifications-tab-btn--approvals' },
  { name: 'Bookings', className: 'notifications-tab-btn--bookings' }
];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState(() =>
    mockNotifications.map((n) => ({ ...n }))
  );
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Filter notifications based on selected tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter(
      (n) => activeTab === 'All' || n.category.toLowerCase() === activeTab.toLowerCase()
    );
  }, [notifications, activeTab]);

  // Mark single notification read/unread
  const handleToggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const nextRead = !n.read;
          showToast(nextRead ? 'Marked notification as read' : 'Marked notification as unread');
          return { ...n, read: nextRead };
        }
        return n;
      })
    );
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read');
  };

  return (
    <div className="notifications-page">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--brand)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            color: 'var(--text-primary)',
            zIndex: 1000,
            fontSize: '0.95rem',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          {toast}
        </div>
      )}

      {/* Header Info */}
      <header className="notifications-header">
        <h1 className="notifications-title">Notifications</h1>
        <p className="notifications-subtitle">
          Keep track of assignment approvals, system alarms, and booking updates.
        </p>
      </header>

      {/* Tabs and Actions Toolbar */}
      <div className="notifications-tabs-toolbar">
        <div className="notifications-tabs">
          {TABS.map((t) => (
            <button
              key={t.name}
              className={`notifications-tab-btn ${t.className} ${
                activeTab === t.name ? 'active' : ''
              }`}
              onClick={() => setActiveTab(t.name)}
            >
              {t.name}
            </button>
          ))}
        </div>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Frameless Notification Lists Grid (matches sketch exactly) */}
      <div className="notifications-list-container">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">No notifications found in this category.</div>
        ) : (
          <ul className="notifications-list">
            {filteredNotifications.map((n) => (
              <li
                key={n.id}
                className={`notifications-item ${n.read ? 'notifications-item--read' : ''}`}
                onClick={() => handleToggleRead(n.id)}
                title="Click to toggle read/unread status"
              >
                <div className="notifications-left">
                  {/* Colored status block icon */}
                  <span
                    className={`notifications-indicator notifications-indicator--${n.indicator || 'blue'}`}
                  />
                  <span className="notifications-text">{n.text}</span>
                </div>
                <span className="notifications-time">{n.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}