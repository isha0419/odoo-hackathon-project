import { STATUS_TONE, PRIORITY_TONE } from '../utils/constants';
import { formatEnumLabel } from '../utils/format';

const TONE_CLASS = {
  success: 'badge-success',
  info: 'badge-info',
  warning: 'badge-warning',
  danger: 'badge-danger',
  purple: 'badge-purple',
  neutral: 'badge-neutral',
};

export default function StatusBadge({ status, priority = false, label }) {
  const tone = (priority ? PRIORITY_TONE[status] : STATUS_TONE[status]) || 'neutral';
  return <span className={`status-badge ${TONE_CLASS[tone]}`}>{label || formatEnumLabel(status)}</span>;
}
