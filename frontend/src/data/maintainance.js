// src/data/maintainance.js
// Mock data for the Maintenance screen (Screen 7).

export const mockMaintenanceTasks = [
  {
    id: 'task-1',
    tag: 'AF-0062',
    name: 'Projector bulb',
    details: 'not turning on',
    status: 'Pending',
    priority: 'High',
    technician: '',
    updatedAt: '12 Jul'
  },
  {
    id: 'task-2',
    tag: 'AF-003',
    name: 'ac unit',
    details: 'noisy compressor',
    status: 'Approved',
    priority: 'Medium',
    technician: '',
    updatedAt: '11 Jul'
  },
  {
    id: 'task-3',
    tag: 'AF-0078',
    name: 'forklift',
    details: 'hydraulic fluid leak',
    status: 'Technician assigned',
    priority: 'High',
    technician: 'R. Varma',
    updatedAt: '10 Jul'
  },
  {
    id: 'task-4',
    tag: 'AF-897',
    name: 'Printer Jam',
    details: 'parts ordered',
    status: 'in progress',
    priority: 'Low',
    technician: 'A. Sen',
    updatedAt: '09 Jul'
  },
  {
    id: 'task-5',
    tag: 'AF-873',
    name: 'Chair repair',
    details: 'resolved 7 Jul',
    status: 'Resolved',
    priority: 'Low',
    technician: 'R. Varma',
    updatedAt: '07 Jul'
  }
];
