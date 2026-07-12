// src/data/assets.js
// Mock data for the Asset Registry screen (Screen 4).
// NOTE: if you already have a data/assets.js with different content,
// merge this in rather than overwrite — the important thing is that
// AF-0114 (the demo anchor asset used on the Allocation screen too)
// stays present and consistent with data/allocations.js.

export const mockAssets = [
  {
    tag: 'AF-0114',
    name: 'Dell Laptop',
    category: 'Electronics',
    status: 'Allocated',
    location: 'Bengaluru',
    department: 'Engineering',
    serial: 'SN-88214',
    assignedTo: 'Priya Shah',
  },
  {
    tag: 'AF-0012',
    name: 'Dell Laptop',
    category: 'Electronics',
    status: 'Allocated',
    location: 'Bengaluru',
    department: 'Engineering',
    serial: 'SN-77120',
    assignedTo: 'Rohit Verma',
  },
  {
    tag: 'AF-0062',
    name: 'Projector',
    category: 'Electronics',
    status: 'Maintenance',
    location: 'HQ floor 2',
    department: 'Operations',
    serial: 'SN-33012',
    assignedTo: null,
  },
  {
    tag: 'AF-0201',
    name: 'Office chair',
    category: 'Furniture',
    status: 'Available',
    location: 'Warehouse',
    department: 'Facilities',
    serial: 'SN-90045',
    assignedTo: null,
  },
  {
    tag: 'AF-0231',
    name: 'iPhone 14',
    category: 'Electronics',
    status: 'Allocated',
    location: 'Mumbai',
    department: 'Sales',
    serial: 'SN-51120',
    assignedTo: 'Arjun Nair',
  },
  {
    tag: 'AF-0057',
    name: 'Logitech MX Keys',
    category: 'Electronics',
    status: 'Available',
    location: 'Warehouse',
    department: 'Engineering',
    serial: 'SN-10234',
    assignedTo: null,
  },
];