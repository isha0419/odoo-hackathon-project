import { api } from './client';

export const orgApi = {
  listDepartments: () => api.get('/departments'),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.patch(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),

  listCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.patch(`/categories/${id}`, data),

  listEmployees: (params) => api.get('/employees', params),
  updateEmployee: (id, data) => api.patch(`/employees/${id}`, data),
};
