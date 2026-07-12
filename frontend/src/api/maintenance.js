import { api } from './client';

export const maintenanceApi = {
  list: (params) => api.get('/maintenance', params),
  raise: (data) => api.post('/maintenance', data),
  transition: (id, toStatus, technicianName) =>
    api.post(`/maintenance/${id}/transition`, { to_status: toStatus, technician_name: technicianName }),
};
