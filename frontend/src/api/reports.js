import { api, getToken } from './client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const reportsApi = {
  utilization: (params) => api.get('/reports/utilization', params),
  mostUsed: (params) => api.get('/reports/most-used', params),
  idle: (params) => api.get('/reports/idle', params),
  maintenanceFrequency: (params) => api.get('/reports/maintenance-frequency', params),
  due: (params) => api.get('/reports/due', params),
  bookingHeatmap: (params) => api.get('/reports/booking-heatmap', params),

  /** Triggers a browser download of the CSV export for the given report key. */
  async exportCsv(report, params = {}) {
    const qs = new URLSearchParams({ report, ...params });
    const res = await fetch(`${API_BASE}/reports/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
