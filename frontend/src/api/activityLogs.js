import { api } from './client';

export const activityLogsApi = {
  list: (params) => api.get('/activity-logs', params),
};
