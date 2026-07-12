// src/data/allocations.js
// Mock data for the Allocation & Transfer screen (Screen 5)
// Replace with real API calls once the backend is wired in.

export const mockAssets = [
  {
    id: 'AF-0114',
    name: 'Dell laptop',
    category: 'Laptop',
    allocatedTo: { id: 'emp-1', name: 'Priya Shah', department: 'Engineering' },
  },
  {
    id: 'AF-0098',
    name: 'HP Monitor 24"',
    category: 'Monitor',
    allocatedTo: null,
  },
  {
    id: 'AF-0231',
    name: 'iPhone 14',
    category: 'Mobile',
    allocatedTo: { id: 'emp-3', name: 'Arjun Nair', department: 'Sales' },
  },
  {
    id: 'AF-0057',
    name: 'Logitech MX Keys',
    category: 'Peripheral',
    allocatedTo: null,
  },
  {
    id: 'AF-0302',
    name: 'MacBook Pro 16"',
    category: 'Laptop',
    allocatedTo: { id: 'emp-4', name: 'Neha Kapoor', department: 'Engineering' },
  },
];

export const mockEmployees = [
  { id: 'emp-1', name: 'Priya Shah', department: 'Engineering' },
  { id: 'emp-2', name: 'Rohit Verma', department: 'Design' },
  { id: 'emp-3', name: 'Arjun Nair', department: 'Sales' },
  { id: 'emp-4', name: 'Neha Kapoor', department: 'Engineering' },
  { id: 'emp-5', name: 'Sanjay Mehta', department: 'Operations' },
  { id: 'emp-6', name: 'Kavya Iyer', department: 'HR' },
];

// Keyed by asset id, newest entry first
export const mockAllocationHistory = {
  'AF-0114': [
    { date: '2026-03-12', type: 'allocated', text: 'Allocated to Priya Shah - Engineering' },
    { date: '2026-01-04', type: 'returned', text: 'Returned by Arjun Nair - condition: good' },
  ],
  'AF-0098': [
    { date: '2025-11-20', type: 'returned', text: 'Returned by Neha Kapoor - condition: good' },
  ],
  'AF-0231': [
    { date: '2026-05-02', type: 'allocated', text: 'Allocated to Arjun Nair - Sales' },
  ],
  'AF-0057': [],
  'AF-0302': [
    { date: '2026-06-18', type: 'allocated', text: 'Allocated to Neha Kapoor - Engineering' },
  ],
};