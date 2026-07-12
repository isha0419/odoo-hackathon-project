import { useState } from 'react';
import Card from '../components/Card/Card';
import Table from '../components/Table/Table';
import { mockNotifications, mockActivityLog } from '../data/notifications';
import './Notifications.css';

const TABS = ['All', 'Alerts', 'Approvals', 'Bookings'];

// Screen 10 — Notifications & Activity Logs
// Owner: Isha
// TODO(Isha): replace mock data with api.get('/notifications') and
// api.get('/activity-log'); wire mark-as-read to api.patch(...).
export default function Notifications() {
  const [tab, setTab] = useState('All');

  const filtered = mockNotifications.filter(
    (n) => tab === 'All' || n.category === tab.toLowerCase()
  );

  const activityColumns = [
    { key: 'actor', label: 'Actor' },
    { key: 'action', label: 'Action' },
    { key: 'entity', label: 'Entity' },
    { key: 'timestamp', label: 'Timestamp' },
  ];

  return (
    <div className="notifications">
      <div className="notifications__tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`notifications__tab ${tab === t ? 'notifications__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <ul className="notifications__list">
          {filtered.map((n) => (
            <li key={n.id} className={n.read ? 'read' : 'unread'}>
              <span>{n.text}</span>
              <span className="notifications__time">{n.time}</span>
            </li>
          ))}
        </ul>
      </Card>

      <h3 className="notifications__section-title">Activity Log</h3>
      <Table columns={activityColumns} rows={mockActivityLog} />
    </div>
  );
}