import { api } from './client';

export const authApi = {
  signup: (name, email, password) => api.post('/auth/signup', { name, email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  me: () => api.get('/auth/me'),
};
