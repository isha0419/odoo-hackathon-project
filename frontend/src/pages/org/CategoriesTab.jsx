import { useEffect, useState } from 'react';
import { orgApi } from '../../api/org';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/roles';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';

const FIELD_TYPES = ['str', 'int', 'bool', 'date'];

function dictToRows(dict) {
  return Object.entries(dict || {}).map(([key, type]) => ({ key, type }));
}

function rowsToDict(rows) {
  const dict = {};
  rows.forEach((r) => {
    if (r.key.trim()) dict[r.key.trim()] = r.type;
  });
  return dict;
}

export default function CategoriesTab() {
  const { user } = useAuth();
  const canManage = isAdmin(user);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [rows, setRows] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    orgApi
      .listCategories()
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load categories.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setName('');
    setRows([{ key: '', type: 'str' }]);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditing(cat);
    setName(cat.name);
    setRows(dictToRows(cat.custom_fields).length ? dictToRows(cat.custom_fields) : [{ key: '', type: 'str' }]);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { name, custom_fields: rowsToDict(rows) };
    try {
      if (editing) {
        await orgApi.updateCategory(editing.id, payload);
      } else {
        await orgApi.createCategory(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save category.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Loading categories…" />;

  return (
    <div>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="org-tab-header">
        <p className="page-subtitle" style={{ margin: 0 }}>
          Custom fields define the extra attributes assets in this category can carry.
        </p>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" hint="Create your first asset category." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Custom Fields</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    {Object.keys(c.custom_fields || {}).length ? (
                      <div className="custom-fields-list">
                        {Object.entries(c.custom_fields).map(([k, t]) => (
                          <span key={k} className="custom-field-pill">
                            {k}: {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="page-subtitle">none</span>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <button className="btn btn-sm" onClick={() => openEdit(c)}>
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

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Category' : 'Add Category'}
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
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Custom Fields</label>
              <div className="custom-fields-editor">
                {rows.map((row, i) => (
                  <div className="custom-field-row" key={i}>
                    <input
                      className="input"
                      placeholder="field_name"
                      value={row.key}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], key: e.target.value };
                        setRows(next);
                      }}
                    />
                    <select
                      className="input"
                      value={row.type}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], type: e.target.value };
                        setRows(next);
                      }}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setRows([...rows, { key: '', type: 'str' }])}
                >
                  + Add field
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
