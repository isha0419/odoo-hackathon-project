import { useState } from 'react';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Modal from '../components/Modal/Modal';
import { BarChart, LineChart } from '../components/Charts/Charts';
import { mockReports } from '../data/reports';
import './Reports.css';

// Screen 9 — Reports & Analytics
// Owner: Isha

export default function Reports() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const handleExportSubmit = (e) => {
    e.preventDefault();
    setIsExportOpen(false);
    showToast(`Generating report... Download started for AssetFlow_Report.${exportFormat.toLowerCase()}`);
  };

  const {
    utilizationByDept,
    maintenanceFrequency,
    mostUsedAssets,
    idleAssets,
    dueForMaintenance
  } = mockReports;

  return (
    <div className="reports-page">
      {/* Toast notification */}
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
      <header className="reports-header">
        <h1 className="reports-title">Reports & Analytics</h1>
        <p className="reports-subtitle">
          Monitor resource utilization, maintenance timelines, and lifecycle retirements.
        </p>
      </header>

      {/* Charts Row */}
      <div className="reports-charts-row">
        <Card className="reports-chart-card" padded={false}>
          <h3>Utilization by department</h3>
          <BarChart data={utilizationByDept} />
        </Card>

        <Card className="reports-chart-card" padded={false}>
          <h3>Maintenance Frequency</h3>
          <LineChart data={maintenanceFrequency} />
        </Card>
      </div>

      {/* Lists Row (Most Used and Idle) */}
      <div className="reports-lists-row">
        <div className="reports-list-section">
          <h3 className="reports-list-title">Most used assets</h3>
          <ul className="reports-list">
            {mostUsedAssets.map((item, idx) => (
              <li key={idx} className="reports-list-item">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="reports-list-section">
          <h3 className="reports-list-title">Idle assets</h3>
          <ul className="reports-list">
            {idleAssets.map((item, idx) => (
              <li key={idx} className="reports-list-item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Divider */}
      <hr className="reports-divider" />

      {/* Alert Section */}
      <div className="reports-alert-section">
        <h3 className="reports-alert-title">Assets due for maintenance / nearing retirement</h3>
        <ul className="reports-alert-list">
          {dueForMaintenance.map((item, idx) => (
            <li key={idx} className="reports-alert-item">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Export Section */}
      <div className="reports-export-container">
        <button className="reports-export-btn" onClick={() => setIsExportOpen(true)}>
          Export report
        </button>
      </div>

      {/* Export Configuration Modal */}
      <Modal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Operational Report"
      >
        <form onSubmit={handleExportSubmit} className="maintenance-form">
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
            Choose your preferred export format for the dashboard summary.
          </p>
          <div className="maintenance-field">
            <label htmlFor="export-format" className="maintenance-label">
              Format
            </label>
            <select
              id="export-format"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="PDF">Portable Document Format (.pdf)</option>
              <option value="CSV">Comma Separated Values (.csv)</option>
              <option value="JSON">Javascript Object Notation (.json)</option>
            </select>
          </div>
          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsExportOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Download Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}