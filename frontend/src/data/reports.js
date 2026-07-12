// src/data/reports.js
// Mock data for the Reports & Analytics screen (Screen 9).

export const mockReports = {
  utilizationByDept: [
    { label: 'HR', value: 35 },
    { label: 'Eng', value: 70 },
    { label: 'Ops', value: 95 },
    { label: 'Sales', value: 55 },
    { label: 'Facilities', value: 75 }
  ],
  maintenanceFrequency: [
    { label: 'Jan', value: 4 },
    { label: 'Feb', value: 7 },
    { label: 'Mar', value: 5 },
    { label: 'Apr', value: 8 },
    { label: 'May', value: 6 },
    { label: 'Jun', value: 9 },
    { label: 'Jul', value: 10 }
  ],
  mostUsedAssets: [
    'Room B2: 34 booking this month',
    'Van AF-343: 21 trips this month',
    'Projector AF-335: 18 uses'
  ],
  idleAssets: [
    'Camera AF-0301 : unused 60+ days',
    'chair AF-0410 : unused 45 days'
  ],
  dueForMaintenance: [
    'Forklift AF-0087 : service due in 5 days',
    'Laptop AF-0020 : 4 years old : nearing retirement'
  ]
};