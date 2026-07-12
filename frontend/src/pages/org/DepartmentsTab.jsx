import { useEffect, useState } from 'react';
import { orgApi } from '../../api/org';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/roles';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';
import { ActiveStatus } from '../../utils/constants';

const emptyForm = { name: '', head_user_id: '', parent_department_id: '' };

export default function DepartmentsTab() {
  const { user } = useAuth();
  const canManage = isAdmin(user);

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([orgApi.listDepartments(), orgApi.listEmployees({ limit: 200 })])
      .then(([depts, emps]) => {
        setDepartments(depts);
        setEmployees(emps);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load departments.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(dept) {
    setEditing(dept);
    setForm({
      name: dept.name,
      head_user_id: dept.head_user_id || '',
      parent_department_id: dept.parent_department_id || '',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      name: form.name,
      head_user_id: form.head_user_id || null,
      parent_department_id: form.parent_department_id || null,
    };
    try {
      if (editing) {
        await orgApi.updateDepartment(editing.id, payload);
      } else {
        await orgApi.createDepartment(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save department.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(dept) {
    try {
      if (dept.status === ActiveStatus.ACTIVE) {
        await orgApi.deleteDepartment(dept.id);
      } else {
        await orgApi.updateDepartment(dept.id, { status: ActiveStatus.ACTIVE });
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update department status.');
    }
  }

  if (loading) return <Spinner label="Loading departments…" />;

  return (
    <div>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="org-tab-header">
        <p className="page-subtitle" style={{ margin: 0 }}>
          Hierarchy shown via parent department. Deactivating hides a department from new assignments.
        </p>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Department
          </button>
        )}
      </div>

      {departments.length === 0 ? (
        <EmptyState title="No departments yet" hint="Create your first department to get started." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Head</th>
                <th>Parent Dept</th>
                <th>Status</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.head_name || '—'}</td>
                  <td>{d.parent_name || '—'}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(d)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => toggleStatus(d)}>
                          {d.status === ActiveStatus.ACTIVE ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Department' : 'Add Department'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setModalOpen(false)}>
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
              <label>Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Department Head</label>
              <select
                className="input"
                value={form.head_user_id}
                onChange={(e) => setForm({ ...form, head_user_id: e.target.value })}
              >
                <option value="">— None —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Parent Department</label>
              <select
                className="input"
                value={form.parent_department_id}
                onChange={(e) => setForm({ ...form, parent_department_id: e.target.value })}
              >
                <option value="">— None (top level) —</option>
                {departments
                  .filter((d) => !editing || d.id !== editing.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
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
