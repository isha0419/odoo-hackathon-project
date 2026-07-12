import { api } from './client';

export const assetsApi = {
  list: (params) => api.get('/assets', params),
  get: (id) => api.get(`/assets/${id}`),
  register: (data) => api.post('/assets', data),
  update: (id, data) => api.patch(`/assets/${id}`, data),
};
