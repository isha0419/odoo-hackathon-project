import Card from '../Card/Card';
import './KPI.css';

export default function KPI({ label, value, tone }) {
  return (
    <Card className="kpi">
      <span className="kpi__label">{label}</span>
      <span className={`kpi__value ${tone ? `kpi__value--${tone}` : ''}`}>{value}</span>
    </Card>
  );
}

export function KPIGrid({ children }) {
  return <div className="kpi-grid">{children}</div>;
}