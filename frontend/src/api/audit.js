import { api } from './client';

export const auditApi = {
  listCycles: (params) => api.get('/audit-cycles', params),
  getCycle: (id) => api.get(`/audit-cycles/${id}`),
  createCycle: (data) => api.post('/audit-cycles', data),
  assignAuditors: (id, userIds) => api.post(`/audit-cycles/${id}/auditors`, { user_ids: userIds }),
  closeCycle: (id) => api.post(`/audit-cycles/${id}/close`),
  getDiscrepancies: (id) => api.get(`/audit-cycles/${id}/discrepancies`),
  markItem: (itemId, verification, notes) => api.patch(`/audit-items/${itemId}`, { verification, notes }),
};
