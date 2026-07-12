import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import { KPIGrid } from '../components/KPI/KPI';
import KPI from '../components/KPI/KPI';
import { mockDashboard } from '../data/dashboard';
import './Dashboard.css';

// Screen 2 — Dashboard
// Owner: Yash
// TODO(Yash): replace `mockDashboard` with api.get('/dashboard') in a useEffect.
export default function Dashboard() {
  const { kpis, overdueReturnsCount, recentActivity } = mockDashboard;

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">Today's Overview</h2>

      <KPIGrid>
        <KPI label="Available" value={kpis.available} />
        <KPI label="Allocated" value={kpis.allocated} />
        <KPI label="Available" value={kpis.availableSecondary} />
        <KPI label="Active Bookings" value={kpis.activeBookings} />
        <KPI label="Pending Transfers" value={kpis.pendingTransfers} />
        <KPI label="Upcoming returns" value={kpis.upcomingReturns} />
      </KPIGrid>

      {overdueReturnsCount > 0 && (
        <Card className="dashboard__alert">
          {overdueReturnsCount} assets overdue for return - flagged for follow-up
        </Card>
      )}

      <div className="dashboard__actions">
        <Button variant="primary">+ register asset</Button>
        <Button variant="secondary">Book resource</Button>
        <Button variant="secondary">Raise requests</Button>
      </div>

      <h2 className="dashboard__title">Recent Activity</h2>
      <ul className="dashboard__activity">
        {recentActivity.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </div>
  );
}