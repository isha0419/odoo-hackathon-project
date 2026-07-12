import { useState, useMemo } from 'react';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Modal from '../components/Modal/Modal';
import { mockAssets } from '../data/assets';
import './Audit.css';

// Screen 8 — Asset Audit
// Owner: Isha

const VERIFICATION_STATES = ['Verified', 'Missing', 'Damaged'];

// Initial default cycle matching the wireframe sketch exactly
const DEFAULT_CYCLE = {
  id: 1,
  name: 'Q3 audit: Engineering dept - 1-15 jul',
  auditors: 'A. Rao, S, Iqbal',
  status: 'active', // 'active' | 'closed'
  items: [
    { tag: 'AF-003', name: 'Dell laptop', location: 'Desk E12', verification: 'Verified' },
    { tag: 'AF-9921', name: 'Office chair', location: 'Desk E14', verification: 'Missing' },
    { tag: 'AF-9838', name: 'Monitor', location: 'Desk E15', verification: 'Damaged' },
    { tag: 'AF-0114', name: 'Dell Laptop', location: 'Desk E20', verification: 'Verified' },
    { tag: 'AF-0012', name: 'Dell Laptop', location: 'Desk E22', verification: 'Verified' }
  ]
};

const DEPARTMENT_OPTIONS = ['Engineering', 'Operations', 'Facilities', 'Sales'];

export default function Audit() {
  const [cycle, setCycle] = useState(DEFAULT_CYCLE);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNewCycleModalOpen, setIsNewCycleModalOpen] = useState(false);

  // Form state for creating a new audit cycle
  const [newCycleForm, setNewCycleForm] = useState({
    name: '',
    auditors: '',
    department: DEPARTMENT_OPTIONS[0]
  });

  // Calculate flagged assets (discrepancies: Missing or Damaged)
  const flaggedItems = useMemo(() => {
    return cycle.items.filter(
      (item) => item.verification === 'Missing' || item.verification === 'Damaged'
    );
  }, [cycle.items]);

  // Handler to cycle verification status on click
  const handleToggleVerification = (tag) => {
    if (cycle.status === 'closed') return;

    setCycle((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.tag === tag) {
          const currentIndex = VERIFICATION_STATES.indexOf(item.verification);
          // If state is 'Pending' or not found, go to 'Verified'
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % VERIFICATION_STATES.length;
          return { ...item, verification: VERIFICATION_STATES[nextIndex] };
        }
        return item;
      })
    }));
  };

  const handleCloseCycle = () => {
    setCycle((prev) => ({ ...prev, status: 'closed' }));
    setIsCloseModalOpen(false);
  };

  const handleReopenCycle = () => {
    setCycle((prev) => ({ ...prev, status: 'active' }));
  };

  const handleCreateCycleSubmit = (e) => {
    e.preventDefault();
    if (!newCycleForm.name.trim() || !newCycleForm.auditors.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    // Filter mockAssets matching selected department
    const deptAssets = mockAssets.filter(
      (asset) => asset.department.toLowerCase() === newCycleForm.department.toLowerCase()
    );

    // Fallback: If no assets match department, populate with a few sample items
    const cycleItems = deptAssets.length > 0 
      ? deptAssets.map((asset) => ({
          tag: asset.tag,
          name: asset.name,
          location: asset.location || 'Warehouse',
          verification: 'Pending'
        }))
      : [
          { tag: 'AF-NEW1', name: 'Sample Office Desk', location: 'Floor 1', verification: 'Pending' },
          { tag: 'AF-NEW2', name: 'Sample Office Chair', location: 'Floor 1', verification: 'Pending' },
          { tag: 'AF-NEW3', name: 'Sample Monitor', location: 'Floor 1', verification: 'Pending' }
        ];

    setCycle({
      id: Date.now(),
      name: newCycleForm.name,
      auditors: newCycleForm.auditors,
      status: 'active',
      items: cycleItems
    });

    setIsNewCycleModalOpen(false);
    // Reset form
    setNewCycleForm({
      name: '',
      auditors: '',
      department: DEPARTMENT_OPTIONS[0]
    });
  };

  const getBadgeClassName = (status) => {
    switch (status) {
      case 'Verified':
        return 'audit-badge-btn audit-badge-btn--verified';
      case 'Missing':
        return 'audit-badge-btn audit-badge-btn--missing';
      case 'Damaged':
        return 'audit-badge-btn audit-badge-btn--damaged';
      default:
        return 'audit-badge-btn audit-badge-btn--pending';
    }
  };

  return (
    <div className="audit-page">
      {/* 1. Header Card (matches top brown block in mockup) */}
      <div className="audit-header-card">
        <div className="audit-header-info">
          <h2 className="audit-cycle-title">{cycle.name}</h2>
          <p className="audit-cycle-auditors">Auditors: {cycle.auditors}</p>
        </div>
        <span
          className={`audit-cycle-badge ${
            cycle.status === 'active' ? 'audit-cycle-badge--active' : 'audit-cycle-badge--closed'
          }`}
        >
          {cycle.status === 'active' ? 'Active' : 'Closed'}
        </span>
      </div>

      {/* Toolbar for actions */}
      <div className="audit-toolbar">
        <div className="audit-instruction-row">
          {cycle.status === 'active' ? (
            <p className="audit-instruction-text">
              💡 Tip: Click on any verification badge in the table to cycle its audit status.
            </p>
          ) : (
            <p className="audit-instruction-text text-green">
              ✓ This audit cycle is locked. All results are finalized.
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setIsNewCycleModalOpen(true)}>
          + Start New Cycle
        </Button>
      </div>

      {/* 2. Checklist Table */}
      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Asset</th>
              <th style={{ width: '35%' }}>Expected Location</th>
              <th style={{ width: '25%', textAlign: 'right' }}>Verification</th>
            </tr>
          </thead>
          <tbody>
            {cycle.items.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-state">
                  No assets in this audit cycle.
                </td>
              </tr>
            ) : (
              cycle.items.map((item) => (
                <tr key={item.tag}>
                  <td>
                    <span className="audit-asset-name">{item.name}</span>
                    <span className="audit-asset-tag">{item.tag}</span>
                  </td>
                  <td>
                    <span className="audit-location">{item.location}</span>
                  </td>
                  <td>
                    <button
                      className={getBadgeClassName(item.verification)}
                      onClick={() => handleToggleVerification(item.tag)}
                      disabled={cycle.status === 'closed'}
                      title={cycle.status === 'active' ? 'Click to toggle status' : 'Cycle closed'}
                    >
                      {item.verification}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Divider matching sketch */}
      <hr style={{ border: '0', borderTop: '1.5px solid var(--border-subtle)', margin: '0' }} />

      {/* 3. Discrepancy report banner (matches dark gold/yellow block in mockup) */}
      {flaggedItems.length > 0 ? (
        <div
          className="audit-discrepancy-banner"
          onClick={() => setIsReportModalOpen(true)}
          role="button"
          title="Click to view full discrepancy report"
        >
          <div className="audit-discrepancy-banner-text">
            <span>⚠</span>
            <strong>
              {flaggedItems.length} {flaggedItems.length === 1 ? 'asset' : 'assets'} flagged -
              discrepancy report generated automatically
            </strong>
          </div>
          <span className="audit-discrepancy-banner-action">View Report</span>
        </div>
      ) : (
        <div
          className="audit-discrepancy-banner"
          style={{
            background: 'rgba(53, 196, 124, 0.05)',
            borderColor: 'rgba(53, 196, 124, 0.3)',
            color: 'var(--status-green)',
            cursor: 'default'
          }}
        >
          <div className="audit-discrepancy-banner-text">
            <span>✓</span>
            <strong>All assets verified - no discrepancies found.</strong>
          </div>
        </div>
      )}

      {/* 4. Bottom action buttons */}
      <div className="audit-actions-row">
        <div>
          {cycle.status === 'closed' && (
            <Button variant="ghost" onClick={handleReopenCycle}>
              Reopen Audit Cycle
            </Button>
          )}
        </div>
        <div>
          {cycle.status === 'active' ? (
            <Button variant="primary" onClick={() => setIsCloseModalOpen(true)}>
              Close audit cycle
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              Audit Cycle Finalized
            </Button>
          )}
        </div>
      </div>

      {/* MODAL 1: Close Audit Confirmation */}
      <Modal
        open={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Close Audit Cycle"
        footer={
          <div className="audit-form-actions">
            <Button variant="secondary" onClick={() => setIsCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCloseCycle}>
              Yes, Close Cycle
            </Button>
          </div>
        }
      >
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
          Are you sure you want to close this audit cycle?
        </p>
        <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          This will finalize the verification states, generate a read-only discrepancy report, and lock the table.
        </p>
      </Modal>

      {/* MODAL 2: Auto-Generated Discrepancy Report */}
      <Modal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Discrepancy Report"
        footer={
          <div className="audit-form-actions">
            <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert('Report details exported successfully (CSV Mocked).');
                setIsReportModalOpen(false);
              }}
            >
              Export CSV
            </Button>
          </div>
        }
      >
        <div className="discrepancy-modal-summary">
          <div className="discrepancy-stat">
            <span className="discrepancy-stat-val discrepancy-stat-val--missing">
              {cycle.items.filter((i) => i.verification === 'Missing').length}
            </span>
            <span className="discrepancy-stat-label">Missing</span>
          </div>
          <div className="discrepancy-stat">
            <span className="discrepancy-stat-val discrepancy-stat-val--damaged">
              {cycle.items.filter((i) => i.verification === 'Damaged').length}
            </span>
            <span className="discrepancy-stat-label">Damaged</span>
          </div>
        </div>

        <table className="discrepancy-modal-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Expected Location</th>
              <th>Issue</th>
            </tr>
          </thead>
          <tbody>
            {flaggedItems.map((item) => (
              <tr key={item.tag}>
                <td>
                  <strong>{item.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                    {item.tag}
                  </span>
                </td>
                <td>{item.location}</td>
                <td>
                  <span
                    style={{
                      color: item.verification === 'Missing' ? 'var(--status-red)' : 'var(--status-orange)',
                      fontWeight: 'bold'
                    }}
                  >
                    {item.verification}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      {/* MODAL 3: Start New Audit Cycle */}
      <Modal
        open={isNewCycleModalOpen}
        onClose={() => setIsNewCycleModalOpen(false)}
        title="Start New Audit Cycle"
      >
        <form onSubmit={handleCreateCycleSubmit} className="audit-form">
          <div className="audit-field">
            <label htmlFor="new-cycle-name" className="audit-label">
              Cycle Name
            </label>
            <input
              id="new-cycle-name"
              type="text"
              placeholder="e.g. Q4 audit: Facilities dept - 1-15 Oct"
              className="audit-input"
              value={newCycleForm.name}
              onChange={(e) => setNewCycleForm({ ...newCycleForm, name: e.target.value })}
              required
            />
          </div>

          <div className="audit-form-row">
            <div className="audit-field">
              <label htmlFor="new-cycle-auditors" className="audit-label">
                Auditors
              </label>
              <input
                id="new-cycle-auditors"
                type="text"
                placeholder="e.g. M. Kumar, S. Sen"
                className="audit-input"
                value={newCycleForm.auditors}
                onChange={(e) => setNewCycleForm({ ...newCycleForm, auditors: e.target.value })}
                required
              />
            </div>

            <div className="audit-field">
              <label htmlFor="new-cycle-department" className="audit-label">
                Department to Audit
              </label>
              <select
                id="new-cycle-department"
                className="audit-input"
                value={newCycleForm.department}
                onChange={(e) =>
                  setNewCycleForm({ ...newCycleForm, department: e.target.value })
                }
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="audit-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsNewCycleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Start Cycle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}