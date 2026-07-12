// src/data/organization.js
// Mock data for the Organization Setup screen (Screen 3).

export const mockDepartments = [
  {
    id: 'dept-1',
    name: 'Engineering',
    head: 'aditi rao',
    parent: '--',
    status: 'Active'
  },
  {
    id: 'dept-2',
    name: 'Facilities',
    head: 'rohan mehta',
    parent: '--',
    status: 'Active'
  },
  {
    id: 'dept-3',
    name: 'Field ops (east)',
    head: 'sana iqbal',
    parent: 'Field Ops',
    status: 'Inactive'
  }
];

export const mockCategories = [
  {
    id: 'cat-1',
    name: 'Electronics',
    prefix: 'ELEC',
    customFields: ['CPU', 'RAM', 'Storage', 'OS'],
    status: 'Active'
  },
  {
    id: 'cat-2',
    name: 'Furniture',
    prefix: 'FURN',
    customFields: ['Material', 'Dimensions', 'Color'],
    status: 'Active'
  },
  {
    id: 'cat-3',
    name: 'Vehicles',
    prefix: 'VEHI',
    customFields: ['License Plate', 'Mileage', 'Fuel Type'],
    status: 'Active'
  }
];

export const mockEmployees = [
  {
    id: 'emp-1',
    name: 'Aditi Rao',
    email: 'aditi@assetflow.com',
    role: 'Admin'
  },
  {
    id: 'emp-2',
    name: 'Rohan Mehta',
    email: 'rohan@assetflow.com',
    role: 'User'
  },
  {
    id: 'emp-3',
    name: 'Sana Iqbal',
    email: 'sana@assetflow.com',
    role: 'Auditor'
  },
  {
    id: 'emp-4',
    name: 'Priya Shah',
    email: 'priya@assetflow.com',
    role: 'User'
  }
];
