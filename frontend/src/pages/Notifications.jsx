import { useEffect, useState } from 'react';
import { notificationsApi } from '../api/notifications';
import { activityLogsApi } from '../api/activityLogs';
import { ApiError } from '../api/client';
import { NotificationType } from '../utils/constants';
import Tabs from '../components/Tabs';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Banner from '../components/Banner';
import { timeAgo } from '../utils/format';
import './Notifications.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'bookings', label: 'Bookings' },
];

const CATEGORY_FOR_TYPE = {
  [NotificationType.OVERDUE_RETURN]: 'alerts',
  [NotificationType.AUDIT_DISCREPANCY]: 'alerts',
  [NotificationType.ASSET_ASSIGNED]: 'alerts',
  [NotificationType.MAINTENANCE_APPROVED]: 'approvals',
  [NotificationType.MAINTENANCE_REJECTED]: 'approvals',
  [NotificationType.TRANSFER_APPROVED]: 'approvals',
  [NotificationType.TRANSFER_REJECTED]: 'approvals',
  [NotificationType.BOOKING_CONFIRMED]: 'bookings',
  [NotificationType.BOOKING_CANCELLED]: 'bookings',
  [NotificationType.BOOKING_REMINDER]: 'bookings',
};

const TONE_FOR_TYPE = {
  [NotificationType.OVERDUE_RETURN]: 'danger',
  [NotificationType.AUDIT_DISCREPANCY]: 'danger',
  [NotificationType.MAINTENANCE_REJECTED]: 'danger',
  [NotificationType.TRANSFER_REJECTED]: 'danger',
  [NotificationType.BOOKING_CANCELLED]: 'danger',
  [NotificationType.ASSET_ASSIGNED]: 'info',
  [NotificationType.MAINTENANCE_APPROVED]: 'success',
  [NotificationType.TRANSFER_APPROVED]: 'success',
  [NotificationType.BOOKING_CONFIRMED]: 'success',
  [NotificationType.BOOKING_REMINDER]: 'warning',
};

function formatAction(action) {
  if (!action) return '';
  return action
    .replace(/[._]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Notifications() {
  const [tab, setTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    notificationsApi
      .list({ limit: 100 })
      .then(setNotifications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load notifications.'))
      .finally(() => setLoading(false));
    activityLogsApi
      .list({ limit: 30 })
      .then(setLogs)
      .catch(() => setLogs([]));
  }

  useEffect(load, []);

  async function handleClick(n) {
    if (n.is_read) return;
    try {
      await notificationsApi.markRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    } catch {
      // Non-critical — leave state as-is.
    }
  }

  const filtered = notifications.filter((n) => tab === 'all' || CATEGORY_FOR_TYPE[n.type] === tab);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Notifications &amp; Activity</h1>
          <p className="page-subtitle">Everything that happened, and everything waiting on you.</p>
        </div>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <Spinner label="Loading notifications…" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No notifications in this view" />
      ) : (
        <ul className="notif-list">
          {filtered.map((n) => (
            <li key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => handleClick(n)}>
              <span className={`notif-dot notif-dot-${TONE_FOR_TYPE[n.type] || 'info'}`} />
              <div className="notif-body">
                <div className="notif-message">{n.message}</div>
                <div className="notif-meta">{formatAction(n.type)}</div>
              </div>
              <span className="notif-time">{timeAgo(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Recent Activity Log</h2>
        {logs.length === 0 ? (
          <p className="page-subtitle">No activity recorded yet.</p>
        ) : (
          <ul className="activity-list">
            {logs.map((l) => (
              <li key={l.id}>
                <span>
                  {l.actor.name} — {formatAction(l.action)}
                </span>
                <span className="activity-time">{timeAgo(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
