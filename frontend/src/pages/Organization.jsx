import { useState } from 'react';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Modal from '../components/Modal/Modal';
import { mockDepartments, mockCategories, mockEmployees } from '../data/organization';
import './Organization.css';

// Screen 3 — Organization Setup
// Owner: Yash

export default function Organization() {
  const [activeTab, setActiveTab] = useState('Departments');

  // Core registries state
  const [departments, setDepartments] = useState(() => mockDepartments.map((d) => ({ ...d })));
  const [categories, setCategories] = useState(() => mockCategories.map((c) => ({ ...c })));
  const [employees, setEmployees] = useState(() => mockEmployees.map((e) => ({ ...e })));

  // Modal open states
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);

  // Selected item for edits
  const [editingDept, setEditingDept] = useState(null);
  const [editingCat, setEditingCat] = useState(null);

  // Form states
  const [deptForm, setDeptForm] = useState({
    name: '',
    head: '',
    parent: '--',
    status: 'Active'
  });
  const [catForm, setCatForm] = useState({
    name: '',
    prefix: '',
    status: 'Active'
  });
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    role: 'User'
  });

  const [newCustomField, setNewCustomField] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Actions for Departments
  const handleToggleDeptStatus = (id) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextStatus = d.status === 'Active' ? 'Inactive' : 'Active';
          showToast(`Changed ${d.name} status to ${nextStatus}. Picklists synced.`);
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
  };

  const handleOpenDeptAdd = () => {
    setEditingDept(null);
    setDeptForm({ name: '', head: '', parent: '--', status: 'Active' });
    setIsDeptModalOpen(true);
  };

  const handleOpenDeptEdit = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, head: dept.head, parent: dept.parent, status: dept.status });
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = (e) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.head.trim()) {
      alert('Please fill in Name and Head.');
      return;
    }

    if (editingDept) {
      // Edit
      setDepartments((prev) =>
        prev.map((d) => (d.id === editingDept.id ? { ...d, ...deptForm } : d))
      );
      showToast(`Updated department "${deptForm.name}". Picklists synced.`);
    } else {
      // Create new
      const newDept = {
        id: `dept-${Date.now()}`,
        ...deptForm
      };
      setDepartments((prev) => [...prev, newDept]);
      showToast(`Created department "${deptForm.name}". Picklists synced.`);
    }
    setIsDeptModalOpen(false);
  };

  // Actions for Categories
  const handleOpenCatAdd = () => {
    setEditingCat(null);
    setCatForm({ name: '', prefix: '', status: 'Active' });
    setIsCatModalOpen(true);
  };

  const handleOpenCatEdit = (cat) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, prefix: cat.prefix, status: cat.status });
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = (e) => {
    e.preventDefault();
    if (!catForm.name.trim() || !catForm.prefix.trim()) {
      alert('Please fill in Name and Prefix.');
      return;
    }

    if (editingCat) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCat.id ? { ...c, ...catForm } : c))
      );
      showToast(`Updated Category "${catForm.name}"`);
    } else {
      const newCat = {
        id: `cat-${Date.now()}`,
        customFields: [],
        ...catForm
      };
      setCategories((prev) => [...prev, newCat]);
      showToast(`Created Category "${catForm.name}"`);
    }
    setIsCatModalOpen(false);
  };

  const handleAddFieldToCat = (catId) => {
    if (!newCustomField.trim()) return;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          return { ...c, customFields: [...c.customFields, newCustomField.trim()] };
        }
        return c;
      })
    );
    setNewCustomField('');
  };

  const handleRemoveFieldFromCat = (catId, fieldName) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          return { ...c, customFields: c.customFields.filter((f) => f !== fieldName) };
        }
        return c;
      })
    );
  };

  // Actions for Employees (Role promotion actions)
  const handlePromoteRole = (id) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          let nextRole = 'User';
          if (emp.role === 'User') nextRole = 'Auditor';
          else if (emp.role === 'Auditor') nextRole = 'Admin';
          showToast(`Promoted ${emp.name} to ${nextRole}`);
          return { ...emp, role: nextRole };
        }
        return emp;
      })
    );
  };

  const handleDemoteRole = (id) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          let nextRole = 'User';
          if (emp.role === 'Admin') nextRole = 'Auditor';
          else if (emp.role === 'Auditor') nextRole = 'User';
          showToast(`Demoted ${emp.name} to ${nextRole}`);
          return { ...emp, role: nextRole };
        }
        return emp;
      })
    );
  };

  const handleEmpSubmit = (e) => {
    e.preventDefault();
    if (!empForm.name.trim() || !empForm.email.trim()) {
      alert('Please fill in Name and Email.');
      return;
    }

    const newEmp = {
      id: `emp-${Date.now()}`,
      ...empForm
    };
    setEmployees((prev) => [...prev, newEmp]);
    setIsEmpModalOpen(false);
    showToast(`Added employee "${empForm.name}"`);
    setEmpForm({ name: '', email: '', role: 'User' });
  };

  // Contextual handler for the generic "+ Add" action
  const handleContextualAdd = () => {
    if (activeTab === 'Departments') handleOpenDeptAdd();
    if (activeTab === 'Categories') handleOpenCatAdd();
    if (activeTab === 'Employees') setIsEmpModalOpen(true);
  };

  return (
    <div className="org-page">
      {/* Toast Popup */}
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

      {/* Page Title */}
      <div className="org-header-section">
        <h1 className="org-title">Organization Setup</h1>
        <p className="org-subtitle">Configure departments, category hierarchies, and manage staff roles.</p>
      </div>

      {/* Tabs and Add Toolbar */}
      <div className="org-tabs-toolbar">
        <div className="org-tabs">
          <button
            className={`org-tab-btn ${activeTab === 'Departments' ? 'org-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('Departments')}
          >
            Departments
          </button>
          <button
            className={`org-tab-btn ${activeTab === 'Categories' ? 'org-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('Categories')}
          >
            Categories
          </button>
          <button
            className={`org-tab-btn ${activeTab === 'Employees' ? 'org-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('Employees')}
          >
            Employees
          </button>
        </div>
        <Button variant="primary" onClick={handleContextualAdd}>
          + Add
        </Button>
      </div>

      {/* Tab Panels */}
      <div className="org-table-container">
        {/* PANEL 1: DEPARTMENTS */}
        {activeTab === 'Departments' && (
          <table className="org-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Head</th>
                <th>Parent Dept</th>
                <th>Status</th>
                <th className="org-table-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td style={{ fontWeight: '500' }}>{dept.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{dept.head}</td>
                  <td>{dept.parent}</td>
                  <td>
                    <button
                      className={`org-status-badge ${
                        dept.status === 'Active'
                          ? 'org-status-badge--active'
                          : 'org-status-badge--inactive'
                      }`}
                      onClick={() => handleToggleDeptStatus(dept.id)}
                      title="Click to toggle status"
                    >
                      {dept.status}
                    </button>
                  </td>
                  <td className="org-table-actions-cell">
                    <button className="org-inline-btn" onClick={() => handleOpenDeptEdit(dept)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PANEL 2: CATEGORIES */}
        {activeTab === 'Categories' && (
          <table className="org-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Code Prefix</th>
                <th>Custom Fields</th>
                <th>Status</th>
                <th className="org-table-actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: '500' }}>{cat.name}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cat.prefix}</td>
                  <td>
                    <div className="org-custom-fields-list">
                      {cat.customFields.length === 0 ? (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          No fields defined
                        </span>
                      ) : (
                        cat.customFields.map((field) => (
                          <span key={field} className="org-field-tag">
                            {field}
                            <button
                              className="org-field-tag-remove"
                              onClick={() => handleRemoveFieldFromCat(cat.id, field)}
                              title={`Remove field ${field}`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="org-status-badge org-status-badge--active">{cat.status}</span>
                  </td>
                  <td className="org-table-actions-cell">
                    <button className="org-inline-btn" onClick={() => handleOpenCatEdit(cat)}>
                      Rename
                    </button>
                    <button
                      className="org-inline-btn org-inline-btn--promote"
                      onClick={() => {
                        setEditingCat(cat);
                        // Open field manager modal inline
                        const f = prompt(`Add custom field to category ${cat.name}:`);
                        if (f && f.trim()) {
                          setCategories((prev) =>
                            prev.map((c) =>
                              c.id === cat.id ? { ...c, customFields: [...c.customFields, f.trim()] } : c
                            )
                          );
                          showToast(`Added field "${f}" to ${cat.name}`);
                        }
                      }}
                      title="Add Custom Field"
                    >
                      + Field
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PANEL 3: EMPLOYEES */}
        {activeTab === 'Employees' && (
          <table className="org-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="org-table-actions-cell">Role actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '500' }}>{emp.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                  <td>
                    <span
                      className={`org-employee-role org-employee-role--${emp.role.toLowerCase()}`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td className="org-table-actions-cell">
                    {emp.role !== 'Admin' && (
                      <button
                        className="org-inline-btn org-inline-btn--promote"
                        onClick={() => handlePromoteRole(emp.id)}
                      >
                        Promote
                      </button>
                    )}
                    {emp.role !== 'User' && (
                      <button
                        className="org-inline-btn org-inline-btn--demote"
                        onClick={() => handleDemoteRole(emp.id)}
                      >
                        Demote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Footer Note (matching bottom of sketch) */}
      <footer className="org-footer-note">
        <p className="org-note-text">
          Editing a department here also drives the picklist in Screen 4 & 5
        </p>
      </footer>

      {/* MODAL 1: Add/Edit Department */}
      <Modal
        open={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Add Department'}
      >
        <form onSubmit={handleDeptSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="dept-name" className="maintenance-label">
              Department Name
            </label>
            <input
              id="dept-name"
              type="text"
              placeholder="e.g. Finance"
              className="org-tab-btn"
              style={{ width: '100%', textTransform: 'capitalize' }}
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="dept-head" className="maintenance-label">
              Head of Department
            </label>
            <input
              id="dept-head"
              type="text"
              placeholder="e.g. aditi rao"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={deptForm.head}
              onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="dept-parent" className="maintenance-label">
              Parent Department
            </label>
            <select
              id="dept-parent"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={deptForm.parent}
              onChange={(e) => setDeptForm({ ...deptForm, parent: e.target.value })}
            >
              <option value="--">None (--)</option>
              {departments
                .filter((d) => d.id !== editingDept?.id)
                .map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="maintenance-field">
            <label htmlFor="dept-status" className="maintenance-label">
              Status
            </label>
            <select
              id="dept-status"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={deptForm.status}
              onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Add/Edit Category */}
      <Modal
        open={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCat ? `Edit Category: ${editingCat.name}` : 'Add Asset Category'}
      >
        <form onSubmit={handleCatSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="cat-name" className="maintenance-label">
              Category Name
            </label>
            <input
              id="cat-name"
              type="text"
              placeholder="e.g. IT Equipment"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="cat-prefix" className="maintenance-label">
              Asset Code Prefix
            </label>
            <input
              id="cat-prefix"
              type="text"
              placeholder="e.g. ITEQ"
              className="org-tab-btn"
              style={{ width: '100%', fontFamily: 'monospace' }}
              value={catForm.prefix}
              onChange={(e) => setCatForm({ ...catForm, prefix: e.target.value.toUpperCase() })}
              required
            />
          </div>

          {editingCat && (
            <div className="maintenance-field">
              <label className="maintenance-label">Manage Custom Fields</label>
              <div className="org-custom-fields-list" style={{ margin: '4px 0 10px 0' }}>
                {editingCat.customFields.map((field) => (
                  <span key={field} className="org-field-tag">
                    {field}
                    <button
                      type="button"
                      className="org-field-tag-remove"
                      onClick={() => handleRemoveFieldFromCat(editingCat.id, field)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="custom-fields-input-row">
                <input
                  type="text"
                  placeholder="New custom field..."
                  className="org-tab-btn"
                  value={newCustomField}
                  onChange={(e) => setNewCustomField(e.target.value)}
                />
                <Button type="button" onClick={() => handleAddFieldToCat(editingCat.id)}>
                  + Add field
                </Button>
              </div>
            </div>
          )}

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsCatModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Add Employee */}
      <Modal open={isEmpModalOpen} onClose={() => setIsEmpModalOpen(false)} title="Add Staff Employee">
        <form onSubmit={handleEmpSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="emp-name" className="maintenance-label">
              Employee Name
            </label>
            <input
              id="emp-name"
              type="text"
              placeholder="e.g. Priya Shah"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={empForm.name}
              onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="emp-email" className="maintenance-label">
              Email Address
            </label>
            <input
              id="emp-email"
              type="email"
              placeholder="e.g. priya@assetflow.com"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={empForm.email}
              onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="emp-role" className="maintenance-label">
              Initial Role
            </label>
            <select
              id="emp-role"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={empForm.role}
              onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
            >
              <option value="User">User</option>
              <option value="Auditor">Auditor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsEmpModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Staff
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}