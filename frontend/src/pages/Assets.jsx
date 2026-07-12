import { useMemo, useState } from 'react';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import SearchBar from '../components/SearchBar/SearchBar';
import Modal from '../components/Modal/Modal';
import { mockAssets } from '../data/assets';
import './Assets.css';

// Screen 4 — Asset Registry
// Owner: Yash
//
// ASSUMED SHARED-COMPONENT PROPS (adjust if your real components differ):
//   <Button variant="primary|secondary|ghost" type="button|submit" onClick disabled>{children}</Button>
//   <Card className>{children}</Card>
//   <SearchBar value onChange placeholder />           // controlled input, onChange gets the event
//   <Modal isOpen onClose title>{children}</Modal>
//
// There's no Table or StatusBadge component in the project yet, so the
// table and status pills below are plain markup styled by Assets.css.

const CATEGORY_OPTIONS = ['Electronics', 'Furniture'];
const STATUS_OPTIONS = ['Allocated', 'Available', 'Maintenance'];
const DEPARTMENT_OPTIONS = ['Engineering', 'Operations', 'Facilities', 'Sales'];

const EMPTY_FORM = {
  tag: '',
  name: '',
  category: CATEGORY_OPTIONS[0],
  status: 'Available',
  department: DEPARTMENT_OPTIONS[0],
  location: '',
};

function statusClassName(status) {
  if (status === 'Allocated') return 'assets-badge assets-badge--allocated';
  if (status === 'Maintenance') return 'assets-badge assets-badge--maintenance';
  return 'assets-badge assets-badge--available';
}

export default function Assets() {
  const [assets, setAssets] = useState(() => mockAssets.map((asset) => ({ ...asset })));
  const [query, setQuery] = useState('');

  const [activeFilter, setActiveFilter] = useState(null); // 'category' | 'status' | 'department' | null
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState(null);
  const [department, setDepartment] = useState(null);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [viewingAsset, setViewingAsset] = useState(null);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesQuery =
        !q ||
        asset.tag.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.serial.toLowerCase().includes(q);
      const matchesCategory = !category || asset.category === category;
      const matchesStatus = !status || asset.status === status;
      const matchesDepartment = !department || asset.department === department;
      return matchesQuery && matchesCategory && matchesStatus && matchesDepartment;
    });
  }, [assets, query, category, status, department]);

  function toggleFilter(name) {
    setActiveFilter((prev) => (prev === name ? null : name));
  }

  function applyFilter(name, value) {
    if (name === 'category') setCategory(value);
    if (name === 'status') setStatus(value);
    if (name === 'department') setDepartment(value);
    setActiveFilter(null);
  }

  function openRegisterModal() {
    setForm(EMPTY_FORM);
    setFormError('');
    setIsRegisterOpen(true);
  }

  function closeRegisterModal() {
    setIsRegisterOpen(false);
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();

    if (!form.tag.trim() || !form.name.trim() || !form.location.trim()) {
      setFormError('Tag, name, and location are required.');
      return;
    }

    if (assets.some((asset) => asset.tag.toLowerCase() === form.tag.trim().toLowerCase())) {
      setFormError(`Asset tag "${form.tag.trim()}" already exists.`);
      return;
    }

    const newAsset = {
      tag: form.tag.trim(),
      name: form.name.trim(),
      category: form.category,
      status: form.status,
      department: form.department,
      location: form.location.trim(),
      serial: `SN-${Math.floor(10000 + Math.random() * 89999)}`,
      assignedTo: null,
    };

    setAssets((prev) => [newAsset, ...prev]);
    setIsRegisterOpen(false);
  }

  return (
    <div className="assets-page">
      <header className="assets-header">
        <h1 className="assets-title">Asset Registry</h1>
        <p className="assets-subtitle">Search, filter, and register organization assets.</p>
      </header>

      <Card className="assets-toolbar-card">
        <div className="assets-search-row">
          <SearchBar
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by tag, serial, or QR code…"
          />
          <Button variant="primary" type="button" onClick={openRegisterModal}>
            + Register Asset
          </Button>
        </div>

        <div className="assets-filter-row">
          <FilterPill
            label="Category"
            value={category}
            options={CATEGORY_OPTIONS}
            isOpen={activeFilter === 'category'}
            onToggle={() => toggleFilter('category')}
            onSelect={(value) => applyFilter('category', value)}
          />
          <FilterPill
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            isOpen={activeFilter === 'status'}
            onToggle={() => toggleFilter('status')}
            onSelect={(value) => applyFilter('status', value)}
          />
          <FilterPill
            label="Department"
            value={department}
            options={DEPARTMENT_OPTIONS}
            isOpen={activeFilter === 'department'}
            onToggle={() => toggleFilter('department')}
            onSelect={(value) => applyFilter('department', value)}
          />
        </div>
      </Card>

      <Card className="assets-table-card">
        <table className="assets-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Location</th>
              <th className="assets-table-action-header">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="assets-table-empty">
                  No assets match your search or filters.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => (
                <tr key={asset.tag}>
                  <td className="assets-table-tag">{asset.tag}</td>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>
                    <span className={statusClassName(asset.status)}>{asset.status}</span>
                  </td>
                  <td>{asset.location}</td>
                  <td className="assets-table-action-cell">
                    <Button variant="ghost" type="button" onClick={() => setViewingAsset(asset)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isRegisterOpen} onClose={closeRegisterModal} title="Register Asset">
        <form onSubmit={handleRegisterSubmit} className="assets-form">
          {formError && <p className="assets-form-error" role="alert">{formError}</p>}

          <div className="assets-form-row">
            <div className="assets-field">
              <label htmlFor="asset-tag" className="assets-label">Tag</label>
              <input
                id="asset-tag"
                type="text"
                className="assets-input"
                placeholder="AF-0000"
                value={form.tag}
                onChange={(event) => updateForm('tag', event.target.value)}
                required
              />
            </div>
            <div className="assets-field">
              <label htmlFor="asset-name" className="assets-label">Name</label>
              <input
                id="asset-name"
                type="text"
                className="assets-input"
                placeholder="e.g. Dell Laptop"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                required
              />
            </div>
          </div>

          <div className="assets-form-row">
            <div className="assets-field">
              <label htmlFor="asset-category" className="assets-label">Category</label>
              <select
                id="asset-category"
                className="assets-input"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="assets-field">
              <label htmlFor="asset-status" className="assets-label">Status</label>
              <select
                id="asset-status"
                className="assets-input"
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="assets-form-row">
            <div className="assets-field">
              <label htmlFor="asset-department" className="assets-label">Department</label>
              <select
                id="asset-department"
                className="assets-input"
                value={form.department}
                onChange={(event) => updateForm('department', event.target.value)}
              >
                {DEPARTMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="assets-field">
              <label htmlFor="asset-location" className="assets-label">Location</label>
              <input
                id="asset-location"
                type="text"
                className="assets-input"
                placeholder="e.g. Bengaluru"
                value={form.location}
                onChange={(event) => updateForm('location', event.target.value)}
                required
              />
            </div>
          </div>

          <div className="assets-form-actions">
            <Button variant="secondary" type="button" onClick={closeRegisterModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewingAsset} onClose={() => setViewingAsset(null)} title={viewingAsset?.tag ?? 'Asset'}>
        {viewingAsset && (
          <dl className="assets-detail-list">
            <div className="assets-detail-row">
              <dt>Name</dt>
              <dd>{viewingAsset.name}</dd>
            </div>
            <div className="assets-detail-row">
              <dt>Category</dt>
              <dd>{viewingAsset.category}</dd>
            </div>
            <div className="assets-detail-row">
              <dt>Status</dt>
              <dd>
                <span className={statusClassName(viewingAsset.status)}>{viewingAsset.status}</span>
              </dd>
            </div>
            <div className="assets-detail-row">
              <dt>Department</dt>
              <dd>{viewingAsset.department}</dd>
            </div>
            <div className="assets-detail-row">
              <dt>Location</dt>
              <dd>{viewingAsset.location}</dd>
            </div>
            <div className="assets-detail-row">
              <dt>Serial</dt>
              <dd>{viewingAsset.serial}</dd>
            </div>
            <div className="assets-detail-row">
              <dt>Assigned to</dt>
              <dd>{viewingAsset.assignedTo ?? '—'}</dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}

function FilterPill({ label, value, options, isOpen, onToggle, onSelect }) {
  return (
    <div className="assets-filter-pill">
      <Button variant="secondary" type="button" onClick={onToggle}>
        {value ?? label}
      </Button>
      {isOpen && (
        <ul className="assets-filter-dropdown" role="listbox">
          <li>
            <button type="button" className="assets-filter-option" onClick={() => onSelect(null)}>
              All
            </button>
          </li>
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="assets-filter-option"
                aria-selected={value === option}
                onClick={() => onSelect(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
