import { api } from './client';

export const notificationsApi = {
  list: (params) => api.get('/notifications', params),
  markRead: (id) => api.post(`/notifications/${id}/read`),
};
