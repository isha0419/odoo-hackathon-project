import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportsApi } from '../api/reports';
import { ApiError } from '../api/client';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import './Reports.css';

const EXPORT_OPTIONS = [
  { key: 'utilization', label: 'Utilization by Department' },
  { key: 'most-used', label: 'Most Used Assets' },
  { key: 'idle', label: 'Idle Assets' },
  { key: 'maintenance-frequency', label: 'Maintenance Frequency' },
  { key: 'due', label: 'Due for Maintenance / Retirement' },
  { key: 'booking-heatmap', label: 'Booking Heatmap' },
];

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Reports() {
  const [utilization, setUtilization] = useState([]);
  const [mostUsed, setMostUsed] = useState([]);
  const [idle, setIdle] = useState([]);
  const [maintenanceFreq, setMaintenanceFreq] = useState([]);
  const [due, setDue] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportKey, setExportKey] = useState(EXPORT_OPTIONS[0].key);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsApi.utilization(),
      reportsApi.mostUsed(),
      reportsApi.idle(),
      reportsApi.maintenanceFrequency(),
      reportsApi.due(),
      reportsApi.bookingHeatmap(),
    ])
      .then(([u, mu, i, mf, d, h]) => {
        setUtilization(u);
        setMostUsed(mu);
        setIdle(i);
        setMaintenanceFreq(mf);
        setDue(d);
        setHeatmap(h);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load reports.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await reportsApi.exportCsv(exportKey);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  const heatmapMax = Math.max(1, ...heatmap.map((b) => b.count));
  const heatmapGrid = new Map(heatmap.map((b) => [`${b.day_of_week}-${b.hour_of_day}`, b.count]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p className="page-subtitle">Utilization, usage patterns, and assets that need attention.</p>
        </div>
        <div className="reports-export">
          <select className="input" value={exportKey} onChange={(e) => setExportKey(e.target.value)}>
            {EXPORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export Report'}
          </button>
        </div>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {loading ? (
        <Spinner label="Loading reports…" />
      ) : (
        <>
          <div className="reports-charts">
            <div className="card">
              <h2 className="section-title">Utilization by Department</h2>
              {utilization.length === 0 ? (
                <EmptyState title="No data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={utilization.map((u) => ({ ...u, ratio_pct: Math.round(u.utilization_ratio * 100) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="department_name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Utilization']} />
                    <Bar dataKey="ratio_pct" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="section-title">Maintenance Frequency</h2>
              {maintenanceFreq.length === 0 ? (
                <EmptyState title="No data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={maintenanceFreq}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="category_name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', fontSize: 12 }} />
                    <Bar dataKey="request_count" fill="var(--info)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="reports-lists">
            <div className="card">
              <h2 className="section-title">Most Used Assets</h2>
              {mostUsed.length === 0 ? (
                <p className="page-subtitle">No usage recorded yet.</p>
              ) : (
                <ul className="report-list">
                  {mostUsed.slice(0, 8).map((a) => (
                    <li key={a.asset_id}>
                      <span className="tag-mono">{a.asset_tag}</span> {a.name}
                      <span className="report-list-value">{a.usage_count} uses</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="section-title">Idle Assets</h2>
              {idle.length === 0 ? (
                <p className="page-subtitle">Nothing idle right now.</p>
              ) : (
                <ul className="report-list">
                  {idle.slice(0, 8).map((a) => (
                    <li key={a.asset_id}>
                      <span className="tag-mono">{a.asset_tag}</span> {a.name}
                      <span className="report-list-value">{a.days_idle}d idle</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">Assets Due for Maintenance / Retirement</h2>
            {due.length === 0 ? (
              <p className="page-subtitle">Nothing due right now.</p>
            ) : (
              <ul className="report-list">
                {due.map((a) => (
                  <li key={a.asset_id}>
                    <span className="tag-mono">{a.asset_tag}</span> {a.name}
                    <span className="report-list-value">{a.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">Booking Heatmap</h2>
            {heatmap.length === 0 ? (
              <p className="page-subtitle">No booking activity yet.</p>
            ) : (
              <div className="heatmap-wrap">
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th></th>
                      {Array.from({ length: 24 }, (_, h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DOW_LABELS.map((label, dow) => (
                      <tr key={dow}>
                        <td className="heatmap-row-label">{label}</td>
                        {Array.from({ length: 24 }, (_, h) => {
                          const count = heatmapGrid.get(`${dow}-${h}`) || 0;
                          const alpha = count === 0 ? 0 : 0.15 + 0.85 * (count / heatmapMax);
                          return (
                            <td key={h} title={`${count} bookings`}>
                              <div className="heatmap-cell" style={{ background: `rgba(34, 197, 94, ${alpha})` }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
