import './Charts.css';

// Simple dependency-free SVG bar chart.
// data: [{ label, value }]
export function BarChart({ data, height = 160 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="chart chart--bar" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="chart__bar-col">
          <div
            className="chart__bar"
            style={{ height: `${(d.value / max) * 100}%` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="chart__bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Simple dependency-free SVG line chart.
// data: [{ label, value }]
export function LineChart({ data, height = 160 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = 100 / Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => `${i * stepX},${100 - (d.value / max) * 100}`)
    .join(' ');

  return (
    <div className="chart chart--line" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart__svg">
        <polyline points={points} fill="none" stroke="var(--status-blue)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart__line-labels">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}