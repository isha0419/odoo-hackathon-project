import { useState } from 'react';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Modal from '../components/Modal/Modal';
import KPI, { KPIGrid } from '../components/KPI/KPI';
import { mockDashboard } from '../data/dashboard';
import { mockAssets } from '../data/assets';
import './Dashboard.css';

// Screen 2 — Dashboard Overview
// Owner: Yash

const CATEGORY_OPTIONS = ['Electronics', 'Furniture'];
const DEPARTMENT_OPTIONS = ['Engineering', 'Operations', 'Facilities', 'Sales'];
const RESOURCE_OPTIONS = ['Conference room B2', 'Room A1', 'Projector AF-0062', 'Van AF-0114'];
const HOURS = ['9:00', '10:00', '11:00', '12:00', '1:00'];

export default function Dashboard() {
  const [kpiStats, setKpiStats] = useState(mockDashboard.kpis);
  const [recentActivities, setRecentActivities] = useState(
    mockDashboard.recentActivity.map((a) => ({ ...a }))
  );
  const [toast, setToast] = useState(null);

  // Modal control states
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // Overdue assets state
  const [overdueAssets, setOverdueAssets] = useState([
    { tag: 'AF-0021', name: 'Dell Monitor', borrower: 'Priya Shah', daysOverdue: 3 },
    { tag: 'AF-0410', name: 'Office Chair', borrower: 'Rohit Verma', daysOverdue: 1 },
    { tag: 'AF-0231', name: 'iPhone 14', borrower: 'Arjun Nair', daysOverdue: 2 }
  ]);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    tag: '',
    name: '',
    category: CATEGORY_OPTIONS[0],
    department: DEPARTMENT_OPTIONS[0],
    location: ''
  });

  const [bookForm, setBookForm] = useState({
    resource: RESOURCE_OPTIONS[0],
    team: '',
    start: '11:00',
    end: '12:00'
  });

  const [requestForm, setRequestForm] = useState({
    assetTag: mockAssets[0]?.tag || '',
    details: '',
    priority: 'Medium'
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Submit Action: Register Asset
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!registerForm.tag.trim() || !registerForm.name.trim()) {
      alert('Please fill out Tag and Name.');
      return;
    }

    // Update KPI Card: Available assets count increases
    setKpiStats((prev) => ({ ...prev, available: prev.available + 1 }));

    // Add activity trail
    const newAct = {
      id: Date.now(),
      text: `${registerForm.name} ${registerForm.tag} - registered - available in ${registerForm.location}`
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    setIsRegisterOpen(false);
    showToast(`✓ Registered asset ${registerForm.name} (${registerForm.tag}) successfully!`);

    // Reset Form
    setRegisterForm({
      tag: '',
      name: '',
      category: CATEGORY_OPTIONS[0],
      department: DEPARTMENT_OPTIONS[0],
      location: ''
    });
  };

  // 2. Submit Action: Book Resource
  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!bookForm.team.trim()) {
      alert('Please enter a team name.');
      return;
    }

    // Update KPI Card: Active bookings count increases
    setKpiStats((prev) => ({ ...prev, activeBookings: prev.activeBookings + 1 }));

    // Add activity trail
    const newAct = {
      id: Date.now(),
      text: `${bookForm.resource} - booking confirmed - ${bookForm.start} to ${bookForm.end} PM`
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    setIsBookOpen(false);
    showToast(`✓ Room successfully booked for the ${bookForm.team}!`);

    // Reset Form
    setBookForm({
      resource: RESOURCE_OPTIONS[0],
      team: '',
      start: '11:00',
      end: '12:00'
    });
  };

  // 3. Submit Action: Raise Request (Maintenance)
  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const asset = mockAssets.find((a) => a.tag === requestForm.assetTag);
    if (!asset) return;

    // Update KPI Card: Pending Transfers or Maintenance (availableSecondary) increases
    setKpiStats((prev) => ({ ...prev, availableSecondary: prev.availableSecondary + 1 }));

    // Add activity trail
    const newAct = {
      id: Date.now(),
      text: `${asset.name} ${asset.tag} - maintenance request raised - details: ${requestForm.details}`
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    setIsRequestOpen(false);
    showToast(`✓ Maintenance request logged for ${asset.name} (${asset.tag})!`);

    // Reset Form
    setRequestForm({
      assetTag: mockAssets[0]?.tag || '',
      details: '',
      priority: 'Medium'
    });
  };

  // Send email reminder to overdue asset borrower
  const handleSendReminder = (borrower, tag) => {
    showToast(`✉ Reminder email sent to ${borrower} regarding asset ${tag}!`);
  };

  return (
    <div className="dashboard">
      {/* Toast popup */}
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

      {/* Title */}
      <h2 className="dashboard__title" style={{ borderBottom: 'none', paddingBottom: '0' }}>
        Today's Overview
      </h2>

      {/* Grid of 6 KPI Cards */}
      <KPIGrid>
        <KPI label="Available" value={kpiStats.available} />
        <KPI label="Allocated" value={kpiStats.allocated} />
        <KPI label="Available" value={kpiStats.availableSecondary} />
        <KPI label="Active Bookings" value={kpiStats.activeBookings} />
        <KPI label="Pending Transfers" value={kpiStats.pendingTransfers} />
        <KPI label="Upcoming returns" value={kpiStats.upcomingReturns} />
      </KPIGrid>

      {/* Red Alert Banner Card (Overdue returns) */}
      {overdueAssets.length > 0 && (
        <div
          className="dashboard__alert"
          onClick={() => setIsOverdueOpen(true)}
          role="button"
          title="Click to view details of overdue assets"
        >
          <span>⚠</span>
          <strong>{overdueAssets.length} assets overdue for return - flagged for follow-up</strong>
        </div>
      )}

      {/* Action button shortcuts row */}
      <div className="dashboard__actions">
        <Button variant="primary" className="btn--register" onClick={() => setIsRegisterOpen(true)}>
          + register asset
        </Button>
        <Button variant="secondary" onClick={() => setIsBookOpen(true)}>
          Book resource
        </Button>
        <Button variant="secondary" onClick={() => setIsRequestOpen(true)}>
          Raise requests
        </Button>
      </div>

      {/* Recent Activity Section */}
      <h2 className="dashboard__title">Recent Activity</h2>
      <ul className="dashboard__activity">
        {recentActivities.map((act) => (
          <li key={act.id} className="dashboard__activity-item">
            {act.text}
          </li>
        ))}
      </ul>

      {/* MODAL 1: Overdue Return details */}
      <Modal
        open={isOverdueOpen}
        onClose={() => setIsOverdueOpen(false)}
        title="Overdue Assets Registry"
      >
        <table className="overdue-modal-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Borrower</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {overdueAssets.map((asset) => (
              <tr key={asset.tag}>
                <td>
                  <strong>{asset.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                    {asset.tag}
                  </span>
                </td>
                <td>{asset.borrower}</td>
                <td style={{ color: 'var(--status-red)', fontWeight: 'bold' }}>
                  {asset.daysOverdue} days late
                </td>
                <td>
                  <button
                    className="overdue-modal-action-btn"
                    onClick={() => handleSendReminder(asset.borrower, asset.tag)}
                  >
                    Remind
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="maintenance-form-actions" style={{ marginTop: '1.25rem' }}>
          <Button variant="secondary" onClick={() => setIsOverdueOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* MODAL 2: Register Asset */}
      <Modal open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Register Asset">
        <form onSubmit={handleRegisterSubmit} className="maintenance-form">
          <div className="audit-form-row">
            <div className="maintenance-field">
              <label htmlFor="reg-tag" className="maintenance-label">
                Tag ID
              </label>
              <input
                id="reg-tag"
                type="text"
                placeholder="e.g. AF-0931"
                className="org-tab-btn"
                value={registerForm.tag}
                onChange={(e) => setRegisterForm({ ...registerForm, tag: e.target.value })}
                required
              />
            </div>

            <div className="maintenance-field">
              <label htmlFor="reg-name" className="maintenance-label">
                Asset Name
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="e.g. Dell Monitor"
                className="org-tab-btn"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="audit-form-row">
            <div className="maintenance-field">
              <label htmlFor="reg-cat" className="maintenance-label">
                Category
              </label>
              <select
                id="reg-cat"
                className="org-tab-btn"
                style={{ width: '100%' }}
                value={registerForm.category}
                onChange={(e) => setRegisterForm({ ...registerForm, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="maintenance-field">
              <label htmlFor="reg-dept" className="maintenance-label">
                Department
              </label>
              <select
                id="reg-dept"
                className="org-tab-btn"
                style={{ width: '100%' }}
                value={registerForm.department}
                onChange={(e) => setRegisterForm({ ...registerForm, department: e.target.value })}
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="maintenance-field">
            <label htmlFor="reg-loc" className="maintenance-label">
              Location
            </label>
            <input
              id="reg-loc"
              type="text"
              placeholder="e.g. Bengaluru HQ"
              className="org-tab-btn"
              value={registerForm.location}
              onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Book Resource */}
      <Modal open={isBookOpen} onClose={() => setIsBookOpen(false)} title="Book a Resource Slot">
        <form onSubmit={handleBookSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="dashboard-book-resource" className="maintenance-label">
              Select Resource
            </label>
            <select
              id="dashboard-book-resource"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={bookForm.resource}
              onChange={(e) => setBookForm({ ...bookForm, resource: e.target.value })}
            >
              {RESOURCE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="maintenance-field">
            <label htmlFor="dashboard-book-team" className="maintenance-label">
              Team / User Name
            </label>
            <input
              id="dashboard-book-team"
              type="text"
              placeholder="e.g. Procurement Team"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={bookForm.team}
              onChange={(e) => setBookForm({ ...bookForm, team: e.target.value })}
              required
            />
          </div>

          <div className="audit-form-row">
            <div className="maintenance-field">
              <label htmlFor="dashboard-book-start" className="maintenance-label">
                Start Time
              </label>
              <select
                id="dashboard-book-start"
                className="org-tab-btn"
                style={{ width: '100%' }}
                value={bookForm.start}
                onChange={(e) => setBookForm({ ...bookForm, start: e.target.value })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="maintenance-field">
              <label htmlFor="dashboard-book-end" className="maintenance-label">
                End Time
              </label>
              <select
                id="dashboard-book-end"
                className="org-tab-btn"
                style={{ width: '100%' }}
                value={bookForm.end}
                onChange={(e) => setBookForm({ ...bookForm, end: e.target.value })}
              >
                {HOURS.map((h) => {
                  // simple check to end later (simplified for hours)
                  return (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsBookOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Raise Requests */}
      <Modal open={isRequestOpen} onClose={() => setIsRequestOpen(false)} title="Raise Maintenance Request">
        <form onSubmit={handleRequestSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="dashboard-request-asset" className="maintenance-label">
              Select Asset
            </label>
            <select
              id="dashboard-request-asset"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={requestForm.assetTag}
              onChange={(e) => setRequestForm({ ...requestForm, assetTag: e.target.value })}
            >
              {mockAssets.map((asset) => (
                <option key={asset.tag} value={asset.tag}>
                  {asset.tag} — {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="maintenance-field">
            <label htmlFor="dashboard-request-details" className="maintenance-label">
              Issue Details
            </label>
            <textarea
              id="dashboard-request-details"
              rows={3}
              placeholder="e.g. noisy compressor, broken wheel, logic error"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={requestForm.details}
              onChange={(e) => setRequestForm({ ...requestForm, details: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="dashboard-request-priority" className="maintenance-label">
              Priority
            </label>
            <select
              id="dashboard-request-priority"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={requestForm.priority}
              onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsRequestOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}