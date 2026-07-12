export default function Spinner({ label }) {
  return (
    <div className="center-block" style={{ flexDirection: 'column', gap: 12 }}>
      <div className="spinner" />
      {label && <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{label}</span>}
    </div>
  );
}
