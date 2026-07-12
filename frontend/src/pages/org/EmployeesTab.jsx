import { useEffect, useState } from 'react';
import { orgApi } from '../../api/org';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/roles';
import { UserRole, ActiveStatus } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';

export default function EmployeesTab() {
  const { user } = useAuth();
  const canManage = isAdmin(user);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ role: '', department_id: '', status: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([orgApi.listEmployees({ limit: 200 }), orgApi.listDepartments()])
      .then(([emps, depts]) => {
        setEmployees(emps);
        setDepartments(depts);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load employees.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openEdit(emp) {
    setEditing(emp);
    setForm({ role: emp.role, department_id: emp.department_id || '', status: emp.status });
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await orgApi.updateEmployee(editing.id, {
        role: form.role,
        department_id: form.department_id || null,
        status: form.status,
      });
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not update employee.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Loading employee directory…" />;

  return (
    <div>
      {error && <Banner tone="danger">{error}</Banner>}
      <p className="page-subtitle" style={{ marginBottom: 14 }}>
        {canManage
          ? 'Promote or demote roles and manage account status. This is the only place roles change.'
          : 'Directory scoped to your access level.'}
      </p>

      {employees.length === 0 ? (
        <EmptyState title="No employees found" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>
                    <StatusBadge status={e.role} label={e.role.replace('_', ' ')} />
                  </td>
                  <td>{e.department_name || '—'}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  {canManage && (
                    <td>
                      <button className="btn btn-sm" onClick={() => openEdit(e)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={`Edit ${editing.name}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            {formError && <div className="form-error">{formError}</div>}
            <div className="field">
              <label>Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.values(UserRole).map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <select
                className="input"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {Object.values(ActiveStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
