// Mock shape for GET /reports/summary — swap for a real call later.
export const mockReports = {
  utilizationByDept: [
    { label: 'Eng', value: 82 },
    { label: 'Ops', value: 54 },
    { label: 'HR', value: 20 },
    { label: 'Sales', value: 41 },
  ],
  maintenanceFrequency: [
    { label: 'Jan', value: 4 },
    { label: 'Feb', value: 7 },
    { label: 'Mar', value: 5 },
    { label: 'Apr', value: 9 },
  ],
  mostUsedAssets: ['Room B2 — 34 bookings this month', 'Van AF-393 — 21 trips this month'],
  idleAssets: ['Camera AF-0301 — unused 60+ days', 'Chair AF-0410 — unused 45 days'],
};