import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetsApi } from '../api/assets';
import { orgApi } from '../api/org';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isDeptHeadPlus, isMgrPlus } from '../utils/roles';
import { AssetCondition, AssetStatus } from '../utils/constants';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Banner from '../components/Banner';
import './AssetRegistry.css';

const emptyForm = {
  name: '',
  category_id: '',
  serial_number: '',
  acquisition_date: '',
  acquisition_cost: '',
  condition: AssetCondition.GOOD,
  location: '',
  photo_url: '',
  is_bookable: false,
};

export default function AssetRegistry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canRegister = isMgrPlus(user);
  const canSeeFilters = isDeptHeadPlus(user);

  const [assets, setAssets] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAssets = useCallback(() => {
    setLoading(true);
    setError('');
    assetsApi
      .list({ q, category_id: categoryId, status, department_id: departmentId, limit: 100 })
      .then(setAssets)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load assets.'))
      .finally(() => setLoading(false));
  }, [q, categoryId, status, departmentId]);

  useEffect(() => {
    const handle = setTimeout(loadAssets, 250);
    return () => clearTimeout(handle);
  }, [loadAssets]);

  useEffect(() => {
    if (!canSeeFilters) return;
    orgApi
      .listCategories()
      .then((cats) => {
        setCategories(cats);
        setCategoryMap(Object.fromEntries(cats.map((c) => [c.id, c.name])));
      })
      .catch(() => {});
    orgApi.listDepartments().then(setDepartments).catch(() => {});
  }, [canSeeFilters]);

  function openRegister() {
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: form.acquisition_cost === '' ? null : form.acquisition_cost,
        serial_number: form.serial_number || null,
        location: form.location || null,
        photo_url: form.photo_url || null,
      };
      const created = await assetsApi.register(payload);
      setModalOpen(false);
      loadAssets();
      navigate(`/assets/${created.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not register asset.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Asset Registry</h1>
          <p className="page-subtitle">Search, filter, and register assets across the organization.</p>
        </div>
        {canRegister && (
          <button className="btn btn-primary" onClick={openRegister}>
            + Register Asset
          </button>
        )}
      </div>

      <div className="filters-row">
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search by tag, serial, or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canSeeFilters && (
          <>
            <select className="input" style={{ maxWidth: 180 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="input" style={{ maxWidth: 180 }} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </>
        )}
        <select className="input" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.values(AssetStatus).map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {loading ? (
        <Spinner label="Loading assets…" />
      ) : assets.length === 0 ? (
        <EmptyState title="No assets match your filters" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => navigate(`/assets/${a.id}`)}>
                  <td className="tag-mono">{a.asset_tag}</td>
                  <td>{a.name}</td>
                  <td>{categoryMap[a.category_id] || '—'}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>{a.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title="Register Asset"
          onClose={() => setModalOpen(false)}
          width={560}
          footer={
            <>
              <button className="btn" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Registering…' : 'Register'}
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
            <div className="form-row">
              <div className="field">
                <label>Category</label>
                <select
                  className="input"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Condition</label>
                <select
                  className="input"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                >
                  {Object.values(AssetCondition).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Serial Number</label>
                <input
                  className="input"
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  className="input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Acquisition Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.acquisition_date}
                  onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Acquisition Cost</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.acquisition_cost}
                  onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.is_bookable}
                  onChange={(e) => setForm({ ...form, is_bookable: e.target.checked })}
                />
                Shared / bookable resource (rooms, vehicles…)
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
