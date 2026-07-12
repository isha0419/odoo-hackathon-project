import { useState } from 'react';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Modal from '../components/Modal/Modal';
import { mockAssets } from '../data/assets';
import { mockMaintenanceTasks } from '../data/maintainance';
import './Maintainance.css';

// Screen 7 — Maintenance Management
// Owner: Isha

const COLUMNS = ['Pending', 'Approved', 'Technician assigned', 'in progress', 'Resolved'];
const TECHNICIANS = ['R. Varma', 'A. Sen', 'S. Iqbal', 'M. Das'];

export default function Maintenance() {
  const [tasks, setTasks] = useState(() => mockMaintenanceTasks.map((t) => ({ ...t })));
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Modal open states
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isTechOpen, setIsTechOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Selected item states
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForTech, setTaskForTech] = useState(null);

  // Form states
  const [requestForm, setRequestForm] = useState({
    assetTag: mockAssets[0]?.tag || '',
    details: '',
    priority: 'Medium'
  });
  const [selectedTech, setSelectedTech] = useState(TECHNICIANS[0]);

  // Alert/Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Update backend memory status of an asset
  const updateAssetStatusInMemory = (tag, newStatus) => {
    const asset = mockAssets.find((a) => a.tag === tag);
    if (asset) {
      asset.status = newStatus;
      showToast(`Sync: Asset ${tag} status changed to "${newStatus}"`);
    }
  };

  // Core status transitioning logic
  const moveTask = (taskId, targetCol) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldCol = task.status;
    if (oldCol === targetCol) return;

    // Trigger state update
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === taskId) {
          const updatedTask = { ...t, status: targetCol, updatedAt: 'Today' };

          // Execute business rules:
          // "Approving a card moves the asset to under maintenance, resolving returns it to available"
          if (oldCol === 'Pending' && targetCol !== 'Pending' && targetCol !== 'Resolved') {
            updateAssetStatusInMemory(t.tag, 'Maintenance');
          } else if (targetCol === 'Resolved') {
            updateAssetStatusInMemory(t.tag, 'Available');
          } else if (oldCol !== 'Pending' && targetCol === 'Pending') {
            updateAssetStatusInMemory(t.tag, 'Available');
          }

          // If moved to "Technician assigned" and has no tech, prompt tech assignment
          if (targetCol === 'Technician assigned' && !t.technician) {
            setTaskForTech(updatedTask);
            setIsTechOpen(true);
          }

          return updatedTask;
        }
        return t;
      })
    );
  };

  // Drag and Drop handlers
  const handleDragStart = (e, id) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      moveTask(id, targetCol);
    }
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  // Form submits
  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const selectedAsset = mockAssets.find((a) => a.tag === requestForm.assetTag);
    if (!selectedAsset) return;

    const newTask = {
      id: `task-${Date.now()}`,
      tag: requestForm.assetTag,
      name: selectedAsset.name,
      details: requestForm.details || 'General maintenance check',
      status: 'Pending',
      priority: requestForm.priority,
      technician: '',
      updatedAt: 'Today'
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsRequestOpen(false);
    setRequestForm({
      assetTag: mockAssets[0]?.tag || '',
      details: '',
      priority: 'Medium'
    });
    showToast(`Created Pending ticket for ${selectedAsset.name} (${newTask.tag})`);
  };

  const handleTechSubmit = (e) => {
    e.preventDefault();
    if (!taskForTech) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskForTech.id ? { ...t, technician: selectedTech } : t))
    );
    setIsTechOpen(false);
    showToast(`Assigned ${selectedTech} to ${taskForTech.name}`);
    setTaskForTech(null);
  };

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  return (
    <div className="maintenance-page">
      {/* Toast popup */}
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

      {/* 1. Header Card */}
      <header className="maintenance-header">
        <div className="maintenance-title-group">
          <h1 className="maintenance-title">Maintenance Management</h1>
          <p className="maintenance-subtitle">
            Track asset health, approve repair orders, and coordinate technicians.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsRequestOpen(true)}>
          + Raise Request
        </Button>
      </header>

      {/* 2. Kanban Board Grid */}
      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status.toLowerCase() === col.toLowerCase());
          const isDragOver = dragOverCol === col;

          return (
            <div
              key={col}
              className={`kanban-column ${isDragOver ? 'kanban-column--dragover' : ''}`}
              onDragOver={(e) => handleDragOver(e, col)}
              onDrop={(e) => handleDrop(e, col)}
              onDragLeave={() => setDragOverCol(null)}
            >
              <div className="kanban-column-header">
                <h3 className="kanban-column-title">{col}</h3>
                <span className="kanban-column-count">{colTasks.length}</span>
              </div>

              <div className="kanban-cards-list">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`kanban-card ${
                      task.status.toLowerCase() === 'resolved' ? 'kanban-card--resolved' : ''
                    } ${draggedTaskId === task.id ? 'kanban-card--dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openTaskDetail(task)}
                    title="Click to view details / drag to move"
                  >
                    <span className="kanban-card-tag">{task.tag}</span>
                    <span className="kanban-card-name">{task.name}</span>
                    <p className="kanban-card-details">{task.details}</p>

                    {task.technician && (
                      <div className="kanban-card-tech">
                        <span>🔧</span>
                        <span>tech: {task.technician}</span>
                      </div>
                    )}

                    <div className="kanban-card-meta">
                      <span className={`priority-badge priority-badge--${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>

                      {/* Manual Quick Action buttons */}
                      <div
                        className="kanban-card-quick-actions"
                        onClick={(e) => e.stopPropagation()} // Stop opening detail modal
                      >
                        {task.status === 'Pending' && (
                          <button
                            className="kanban-card-btn"
                            title="Approve request"
                            onClick={() => moveTask(task.id, 'Approved')}
                          >
                            ✓
                          </button>
                        )}
                        {task.status === 'Approved' && (
                          <button
                            className="kanban-card-btn"
                            title="Assign technician"
                            onClick={() => moveTask(task.id, 'Technician assigned')}
                          >
                            👤
                          </button>
                        )}
                        {task.status === 'Technician assigned' && (
                          <button
                            className="kanban-card-btn"
                            title="Start maintenance"
                            onClick={() => moveTask(task.id, 'in progress')}
                          >
                            ▶
                          </button>
                        )}
                        {task.status === 'in progress' && (
                          <button
                            className="kanban-card-btn"
                            title="Resolve ticket"
                            onClick={() => moveTask(task.id, 'Resolved')}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Footer banner matching bottom of sketch */}
      <footer className="maintenance-footer">
        <p className="maintenance-rules-text">
          <span className="maintenance-rules-icon">ℹ</span>
          Approving a card moves the asset to under maintenance, resolving returns it to available.
        </p>
      </footer>

      {/* MODAL 1: Raise Request Form */}
      <Modal
        open={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title="Raise Maintenance Request"
      >
        <form onSubmit={handleRequestSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="request-asset" className="maintenance-label">
              Select Asset
            </label>
            <select
              id="request-asset"
              className="maintenance-input"
              value={requestForm.assetTag}
              onChange={(e) => setRequestForm({ ...requestForm, assetTag: e.target.value })}
            >
              {mockAssets.map((asset) => (
                <option key={asset.tag} value={asset.tag}>
                  {asset.tag} — {asset.name} ({asset.status})
                </option>
              ))}
            </select>
          </div>

          <div className="maintenance-field">
            <label htmlFor="request-details" className="maintenance-label">
              Issue Details
            </label>
            <textarea
              id="request-details"
              rows={3}
              placeholder="e.g. noisy compressor, screen flicker, broken wheel"
              className="maintenance-input"
              value={requestForm.details}
              onChange={(e) => setRequestForm({ ...requestForm, details: e.target.value })}
              required
            />
          </div>

          <div className="maintenance-field">
            <label htmlFor="request-priority" className="maintenance-label">
              Priority
            </label>
            <select
              id="request-priority"
              className="maintenance-input"
              value={requestForm.priority}
              onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsRequestOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Assign Technician */}
      <Modal
        open={isTechOpen}
        onClose={() => {
          setIsTechOpen(false);
          setTaskForTech(null);
        }}
        title={`Assign Technician: ${taskForTech?.name || ''}`}
      >
        <form onSubmit={handleTechSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="select-tech" className="maintenance-label">
              Choose Technician
            </label>
            <select
              id="select-tech"
              className="maintenance-input"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
            >
              {TECHNICIANS.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>
          <div className="maintenance-form-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsTechOpen(false);
                setTaskForTech(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Assign
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Card Details and Actions */}
      <Modal
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        title={`Maintenance Ticket: ${selectedTask?.tag || ''}`}
        footer={
          <div className="maintenance-form-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedTask(null);
              }}
            >
              Close
            </Button>

            {/* Actions relative to current ticket column */}
            {selectedTask?.status === 'Pending' && (
              <Button
                variant="primary"
                onClick={() => {
                  moveTask(selectedTask.id, 'Approved');
                  setIsDetailOpen(false);
                }}
              >
                Approve Request
              </Button>
            )}
            {selectedTask?.status === 'Approved' && (
              <Button
                variant="primary"
                onClick={() => {
                  moveTask(selectedTask.id, 'Technician assigned');
                  setIsDetailOpen(false);
                }}
              >
                Assign Technician
              </Button>
            )}
            {selectedTask?.status === 'Technician assigned' && (
              <Button
                variant="primary"
                onClick={() => {
                  moveTask(selectedTask.id, 'in progress');
                  setIsDetailOpen(false);
                }}
              >
                Start Work
              </Button>
            )}
            {selectedTask?.status === 'in progress' && (
              <Button
                variant="primary"
                onClick={() => {
                  moveTask(selectedTask.id, 'Resolved');
                  setIsDetailOpen(false);
                }}
              >
                Mark Resolved
              </Button>
            )}
          </div>
        }
      >
        {selectedTask && (
          <div className="card-detail-layout">
            <div className="card-detail-section">
              <h4>Asset Name</h4>
              <p>{selectedTask.name}</p>
            </div>

            <div className="card-detail-section">
              <h4>Issue Details</h4>
              <p>{selectedTask.details}</p>
            </div>

            <div className="card-detail-section" style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <h4>Priority</h4>
                <span
                  className={`priority-badge priority-badge--${selectedTask.priority.toLowerCase()}`}
                >
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <h4>Current Status</h4>
                <span
                  style={{
                    color: 'var(--brand)',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}
                >
                  {selectedTask.status}
                </span>
              </div>
            </div>

            <div className="card-detail-section">
              <h4>Assigned Technician</h4>
              <p>{selectedTask.technician || 'No technician assigned yet.'}</p>
              {selectedTask.status === 'Technician assigned' && (
                <div className="tech-input-group">
                  <select
                    className="maintenance-input"
                    value={selectedTask.technician || selectedTech}
                    onChange={(e) => {
                      const newTech = e.target.value;
                      setTasks((prev) =>
                        prev.map((t) => (t.id === selectedTask.id ? { ...t, technician: newTech } : t))
                      );
                      setSelectedTask((prev) => ({ ...prev, technician: newTech }));
                      showToast(`Reassigned technician to ${newTech}`);
                    }}
                  >
                    {TECHNICIANS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="card-detail-section">
              <h4>Last Updated</h4>
              <p>{selectedTask.updatedAt}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}