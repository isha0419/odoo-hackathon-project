export default function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {hint && <div>{hint}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
