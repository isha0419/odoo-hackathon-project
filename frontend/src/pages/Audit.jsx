import { useEffect, useState } from 'react';
import { auditApi } from '../api/audit';
import { orgApi } from '../api/org';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isMgrPlus } from '../utils/roles';
import { AuditCycleStatus } from '../utils/constants';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Banner from '../components/Banner';
import { formatDate } from '../utils/format';
import './Audit.css';

const emptyCycleForm = { name: '', scope_department_id: '', scope_location: '', start_date: '', end_date: '' };

export default function Audit() {
  const { user } = useAuth();
  const canManage = isMgrPlus(user);

  const [cycles, setCycles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [cycle, setCycle] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCycleForm);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  const [auditorsOpen, setAuditorsOpen] = useState(false);
  const [selectedAuditors, setSelectedAuditors] = useState([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setLoading(true);
    auditApi
      .listCycles({ limit: 100 })
      .then((list) => {
        setCycles(list);
        if (list.length) setSelectedId(list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load audit cycles.'))
      .finally(() => setLoading(false));
    if (canManage) {
      orgApi.listDepartments().then(setDepartments).catch(() => {});
      orgApi.listEmployees({ limit: 200 }).then(setEmployees).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadCycleDetail(id) {
    if (!id) return;
    setError('');
    auditApi
      .getCycle(id)
      .then(setCycle)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load audit cycle.'));
    if (canManage) {
      auditApi
        .getDiscrepancies(id)
        .then((res) => setDiscrepancies(res.discrepancies))
        .catch(() => setDiscrepancies([]));
    }
  }

  useEffect(() => {
    loadCycleDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, canManage]);

  function refreshCycles(nextSelected) {
    auditApi.listCycles({ limit: 100 }).then((list) => {
      setCycles(list);
      if (nextSelected) setSelectedId(nextSelected);
      else loadCycleDetail(selectedId);
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setCreateError('');
    try {
      const created = await auditApi.createCycle({
        name: createForm.name,
        scope_department_id: createForm.scope_department_id || null,
        scope_location: createForm.scope_location || null,
        start_date: createForm.start_date,
        end_date: createForm.end_date,
      });
      setCreateOpen(false);
      setCreateForm(emptyCycleForm);
      refreshCycles(created.id);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create audit cycle.');
    } finally {
      setSaving(false);
    }
  }

  function openAuditors() {
    setSelectedAuditors(cycle?.auditors?.map((a) => a.user.id) || []);
    setAuditorsOpen(true);
  }

  async function handleAssignAuditors(e) {
    e.preventDefault();
    setError('');
    try {
      await auditApi.assignAuditors(cycle.id, selectedAuditors);
      setAuditorsOpen(false);
      refreshCycles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not assign auditors.');
    }
  }

  async function handleClose() {
    setClosing(true);
    setError('');
    try {
      await auditApi.closeCycle(cycle.id);
      refreshCycles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not close audit cycle.');
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <div className="page"><Spinner label="Loading audit cycles…" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Asset Audit</h1>
          <p className="page-subtitle">Audit cycles, checklist verification, and auto-generated discrepancy reports.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            + New Audit Cycle
          </button>
        )}
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {cycles.length === 0 ? (
        <EmptyState title="No audit cycles yet" hint="Create one to start tracking asset verification." />
      ) : (
        <>
          <div className="filters-row">
            <select className="input" style={{ maxWidth: 320 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          {cycle && (
            <>
              <div className="card audit-header-card">
                <div>
                  <div className="audit-cycle-title">{cycle.name}</div>
                  <div className="page-subtitle">
                    {formatDate(cycle.start_date)} – {formatDate(cycle.end_date)}
                    {cycle.scope_location ? ` · ${cycle.scope_location}` : ''}
                  </div>
                  <div className="audit-auditors">
                    Auditors: {cycle.auditors?.length ? cycle.auditors.map((a) => a.user.name).join(', ') : 'none assigned'}
                  </div>
                </div>
                <div className="audit-header-actions">
                  <StatusBadge status={cycle.status} />
                  {canManage && cycle.status === AuditCycleStatus.OPEN && (
                    <>
                      <button className="btn btn-sm" onClick={openAuditors}>
                        Assign Auditors
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={handleClose} disabled={closing}>
                        {closing ? 'Closing…' : 'Close audit cycle'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="audit-counts">
                <CountTile label="Pending" value={cycle.pending_count} tone="warning" />
                <CountTile label="Verified" value={cycle.verified_count} tone="success" />
                <CountTile label="Missing" value={cycle.missing_count} tone="danger" />
                <CountTile label="Damaged" value={cycle.damaged_count} tone="warning" />
              </div>

              {canManage ? (
                <div className="card">
                  <h2 className="section-title">Discrepancy Report</h2>
                  {discrepancies.length > 0 && (
                    <Banner tone="warning">
                      {discrepancies.length} asset{discrepancies.length === 1 ? '' : 's'} flagged — discrepancy report generated automatically.
                    </Banner>
                  )}
                  {discrepancies.length === 0 ? (
                    <p className="page-subtitle">No discrepancies recorded for this cycle yet.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Asset</th>
                            <th>Expected Location</th>
                            <th>Verification</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discrepancies.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <span className="tag-mono">{item.asset.asset_tag}</span> {item.asset.name}
                              </td>
                              <td>{item.expected_location || '—'}</td>
                              <td>
                                <StatusBadge status={item.verification} />
                              </td>
                              <td>{item.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {cycle.pending_count > 0 && (
                    <Banner tone="info" title="Item-by-item verification happens during the physical walkthrough">
                      Assigned auditors mark each asset Verified, Missing, or Damaged as they inspect it in person.
                      The full pending checklist isn't exposed by the current API (only confirmed discrepancies are)
                      — see the note below.
                    </Banner>
                  )}
                </div>
              ) : (
                <Banner tone="info">
                  You're an auditor on this cycle. Ask your Asset Manager for the checklist during the physical
                  walkthrough — this view currently only surfaces cycle-level summaries.
                </Banner>
              )}
            </>
          )}
        </>
      )}

      {createOpen && (
        <Modal
          title="New Audit Cycle"
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            {createError && <div className="form-error">{createError}</div>}
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                placeholder="e.g. Q3 audit: Engineering"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Start date</label>
                <input
                  className="input"
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>End date</label>
                <input
                  className="input"
                  type="date"
                  value={createForm.end_date}
                  onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Scope: Department (optional)</label>
              <select
                className="input"
                value={createForm.scope_department_id}
                onChange={(e) => setCreateForm({ ...createForm, scope_department_id: e.target.value })}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Scope: Location (optional)</label>
              <input
                className="input"
                value={createForm.scope_location}
                onChange={(e) => setCreateForm({ ...createForm, scope_location: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {auditorsOpen && (
        <Modal
          title="Assign Auditors"
          onClose={() => setAuditorsOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setAuditorsOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAssignAuditors}>
                Save
              </button>
            </>
          }
        >
          <form onSubmit={handleAssignAuditors}>
            <div className="audit-auditor-list">
              {employees.map((e) => (
                <label key={e.id} className="audit-auditor-row">
                  <input
                    type="checkbox"
                    checked={selectedAuditors.includes(e.id)}
                    onChange={(ev) => {
                      if (ev.target.checked) setSelectedAuditors([...selectedAuditors, e.id]);
                      else setSelectedAuditors(selectedAuditors.filter((id) => id !== e.id));
                    }}
                  />
                  {e.name} <span className="page-subtitle">({e.department_name || 'no dept'})</span>
                </label>
              ))}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CountTile({ label, value, tone }) {
  return (
    <div className={`audit-count-tile audit-count-${tone}`}>
      <div className="audit-count-value">{value ?? 0}</div>
      <div className="audit-count-label">{label}</div>
    </div>
  );
}
