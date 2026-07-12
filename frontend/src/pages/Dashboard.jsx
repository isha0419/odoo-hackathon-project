import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { ApiError } from '../api/client';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import { timeAgo } from '../utils/format';
import './Dashboard.css';

function formatAction(action) {
  if (!action) return '';
  return action
    .replace(/[._]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi
      .get()
      .then((data) => !cancelled && setKpis(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load dashboard.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="page"><Spinner label="Loading dashboard…" /></div>;
  if (error) return <div className="page"><Banner tone="danger">{error}</Banner></div>;

  const overdueCount = kpis.overdue_returns?.length ?? 0;
  const upcomingCount = kpis.upcoming_returns?.length ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Today's Overview</h1>
          <p className="page-subtitle">Live counts across every asset, booking and workflow.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Available" value={kpis.assets_available} />
        <KpiCard label="Allocated" value={kpis.assets_allocated} />
        <KpiCard label="Under Maintenance" value={kpis.maintenance_today} />
        <KpiCard label="Active Bookings" value={kpis.active_bookings} />
        <KpiCard label="Pending Transfers" value={kpis.pending_transfers} />
        <KpiCard label="Upcoming Returns" value={upcomingCount} />
      </div>

      {overdueCount > 0 && (
        <Banner tone="danger" title={`${overdueCount} asset${overdueCount === 1 ? '' : 's'} overdue for return`}>
          Flagged for follow-up — see Allocation &amp; Transfer for details.
        </Banner>
      )}

      <div className="dashboard-actions">
        <Link className="btn btn-primary" to="/assets">
          + Register Asset
        </Link>
        <Link className="btn" to="/booking">
          Book Resource
        </Link>
        <Link className="btn" to="/maintenance">
          Raise Request
        </Link>
      </div>

      <div className="card">
        <h2 className="section-title">Recent Activity</h2>
        {kpis.recent_activity?.length ? (
          <ul className="activity-list">
            {kpis.recent_activity.map((item) => (
              <li key={item.id}>
                <span>{formatAction(item.action)}</span>
                <span className="activity-time">{timeAgo(item.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="page-subtitle">No activity recorded yet.</p>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value">{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
