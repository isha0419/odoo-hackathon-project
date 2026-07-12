import { useCallback, useEffect, useState } from 'react';
import { maintenanceApi } from '../api/maintenance';
import { assetsApi } from '../api/assets';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isMgrPlus } from '../utils/roles';
import { MAINTENANCE_KANBAN_COLUMNS, MaintenancePriority, MaintenanceStatus } from '../utils/constants';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import Modal from '../components/Modal';
import { timeAgo } from '../utils/format';
import './Maintenance.css';

export default function Maintenance() {
  const { user } = useAuth();
  const canManage = isMgrPlus(user);

  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState({ asset_id: '', issue_description: '', priority: MaintenancePriority.MEDIUM, photo_url: '' });
  const [raiseError, setRaiseError] = useState('');
  const [raising, setRaising] = useState(false);

  const [techModal, setTechModal] = useState(null); // request being assigned a technician
  const [technicianName, setTechnicianName] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    maintenanceApi
      .list({ limit: 200 })
      .then(setRequests)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load maintenance requests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    assetsApi.list({ limit: 100 }).then(setAssets).catch(() => {});
  }, []);

  function openRaise() {
    setRaiseForm({ asset_id: assets[0]?.id || '', issue_description: '', priority: MaintenancePriority.MEDIUM, photo_url: '' });
    setRaiseError('');
    setRaiseOpen(true);
  }

  async function handleRaise(e) {
    e.preventDefault();
    setRaising(true);
    setRaiseError('');
    try {
      await maintenanceApi.raise({
        asset_id: raiseForm.asset_id,
        issue_description: raiseForm.issue_description,
        priority: raiseForm.priority,
        photo_url: raiseForm.photo_url || null,
      });
      setRaiseOpen(false);
      load();
    } catch (err) {
      setRaiseError(err instanceof ApiError ? err.message : 'Could not raise request.');
    } finally {
      setRaising(false);
    }
  }

  async function transition(request, toStatus, technician) {
    setError('');
    setTransitioning(true);
    try {
      await maintenanceApi.transition(request.id, toStatus, technician);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update request.');
    } finally {
      setTransitioning(false);
    }
  }

  function submitTechnician(e) {
    e.preventDefault();
    if (!techModal) return;
    transition(techModal, MaintenanceStatus.TECHNICIAN_ASSIGNED, technicianName).then(() => {
      setTechModal(null);
      setTechnicianName('');
    });
  }

  const rejected = requests.filter((r) => r.status === MaintenanceStatus.REJECTED);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Maintenance</h1>
          <p className="page-subtitle">Approval workflow as a kanban board. Approving moves an asset to Under Maintenance; resolving returns it to Available.</p>
        </div>
        <button className="btn btn-primary" onClick={openRaise}>
          + Raise Request
        </button>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {loading ? (
        <Spinner label="Loading maintenance board…" />
      ) : (
        <>
          <div className="kanban-board">
            {MAINTENANCE_KANBAN_COLUMNS.map((col) => {
              const items = requests.filter((r) => r.status === col.key);
              return (
                <div className="kanban-column" key={col.key}>
                  <div className="kanban-column-header">
                    {col.label} <span className="kanban-count">{items.length}</span>
                  </div>
                  <div className="kanban-column-body">
                    {items.length === 0 && <div className="kanban-empty">No requests</div>}
                    {items.map((r) => (
                      <div className="kanban-card" key={r.id}>
                        <div className="kanban-card-top">
                          <span className="tag-mono">{r.asset.asset_tag}</span>
                          <StatusBadge status={r.priority} priority />
                        </div>
                        <div className="kanban-card-issue">{r.issue_description}</div>
                        <div className="kanban-card-meta">
                          {r.asset.name} · raised by {r.raiser.name} · {timeAgo(r.created_at)}
                        </div>
                        {r.technician_name && <div className="kanban-card-meta">Technician: {r.technician_name}</div>}

                        {canManage && (
                          <div className="kanban-card-actions">
                            {col.key === MaintenanceStatus.PENDING && (
                              <>
                                <button className="btn btn-sm btn-primary" disabled={transitioning} onClick={() => transition(r, MaintenanceStatus.APPROVED)}>
                                  Approve
                                </button>
                                <button className="btn btn-sm btn-danger" disabled={transitioning} onClick={() => transition(r, MaintenanceStatus.REJECTED)}>
                                  Reject
                                </button>
                              </>
                            )}
                            {col.key === MaintenanceStatus.APPROVED && (
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={transitioning}
                                onClick={() => {
                                  setTechModal(r);
                                  setTechnicianName('');
                                }}
                              >
                                Assign Technician
                              </button>
                            )}
                            {col.key === MaintenanceStatus.TECHNICIAN_ASSIGNED && (
                              <button className="btn btn-sm btn-primary" disabled={transitioning} onClick={() => transition(r, MaintenanceStatus.IN_PROGRESS)}>
                                Start Progress
                              </button>
                            )}
                            {col.key === MaintenanceStatus.IN_PROGRESS && (
                              <button className="btn btn-sm btn-primary" disabled={transitioning} onClick={() => transition(r, MaintenanceStatus.RESOLVED)}>
                                Resolve
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {rejected.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h2 className="section-title">Rejected</h2>
              <ul className="history-list">
                {rejected.map((r) => (
                  <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <span className="tag-mono">{r.asset.asset_tag}</span> — {r.issue_description}
                    </span>
                    <span className="page-subtitle">{timeAgo(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {raiseOpen && (
        <Modal
          title="Raise Maintenance Request"
          onClose={() => setRaiseOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setRaiseOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRaise} disabled={raising}>
                {raising ? 'Submitting…' : 'Submit'}
              </button>
            </>
          }
        >
          <form onSubmit={handleRaise}>
            {raiseError && <div className="form-error">{raiseError}</div>}
            <div className="field">
              <label>Asset</label>
              <select
                className="input"
                value={raiseForm.asset_id}
                onChange={(e) => setRaiseForm({ ...raiseForm, asset_id: e.target.value })}
                required
              >
                <option value="">Select asset…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_tag} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Issue Description</label>
              <textarea
                className="input"
                value={raiseForm.issue_description}
                onChange={(e) => setRaiseForm({ ...raiseForm, issue_description: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Priority</label>
              <select className="input" value={raiseForm.priority} onChange={(e) => setRaiseForm({ ...raiseForm, priority: e.target.value })}>
                {Object.values(MaintenancePriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </Modal>
      )}

      {techModal && (
        <Modal
          title="Assign Technician"
          onClose={() => setTechModal(null)}
          footer={
            <>
              <button className="btn" onClick={() => setTechModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitTechnician} disabled={transitioning || !technicianName.trim()}>
                {transitioning ? 'Saving…' : 'Assign'}
              </button>
            </>
          }
        >
          <form onSubmit={submitTechnician}>
            <div className="field">
              <label>Technician Name</label>
              <input className="input" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} required autoFocus />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
