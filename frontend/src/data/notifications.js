// Mock shape for GET /notifications — swap for a real call later.
export const mockNotifications = [
  { id: 1, text: 'Laptop AF-0114 assigned to Priya Shah', time: '2m ago', read: false, category: 'alerts' },
  { id: 2, text: 'Maintenance request AF-0055 approved', time: '18m ago', read: false, category: 'approvals' },
  { id: 3, text: 'Booking confirmed — Room B2, 2:00 to 3:00 PM', time: '1h ago', read: true, category: 'bookings' },
  { id: 4, text: 'Transfer approved — AF-0033 to Facilities dept', time: '3h ago', read: true, category: 'approvals' },
  { id: 5, text: 'Overdue return — AF-0021 was due 3 days ago', time: '1d ago', read: false, category: 'alerts' },
];

export const mockActivityLog = [
  { id: 1, actor: 'Admin', action: 'Approved transfer', entity: 'AF-0033', timestamp: '2026-07-09 14:20' },
  { id: 2, actor: 'A. Rao', action: 'Flagged discrepancy', entity: 'AF-0088', timestamp: '2026-07-10 09:05' },
];