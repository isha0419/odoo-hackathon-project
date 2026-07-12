import { api } from './client';

export const transfersApi = {
  list: (params) => api.get('/transfers', params),
  create: (data) => api.post('/transfers', data),
  approve: (id) => api.post(`/transfers/${id}/approve`),
  reject: (id) => api.post(`/transfers/${id}/reject`),
};
