import './StatusBadge.css';

// Central map from a status string to its visual tone.
// Add new statuses here — do NOT hardcode colors in page files.
const STATUS_TONE = {
  active: 'green',
  verified: 'green',
  resolved: 'green',
  approved: 'green',
  booked: 'green',

  inactive: 'red',
  lost: 'red',
  missing: 'red',
  overdue: 'red',
  conflict: 'red',

  maintenance: 'orange',
  damaged: 'orange',
  pending: 'orange',
  'in progress': 'orange',

  allocated: 'blue',
  assigned: 'blue',
  info: 'blue',
};

export default function StatusBadge({ status, tone }) {
  const resolvedTone = tone || STATUS_TONE[String(status).toLowerCase()] || 'blue';
  return <span className={`status-badge status-badge--${resolvedTone}`}>{status}</span>;
}