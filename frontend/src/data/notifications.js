// src/data/notifications.js
// Mock data for the Activity logs & Notifications screen (Screen 10).

export const mockNotifications = [
  {
    id: 1,
    text: 'Laptop AF-0014 assigned to Priya shah',
    time: '2m ago',
    read: false,
    category: 'alerts',
    indicator: 'blue' // matches mockup indicator colors
  },
  {
    id: 2,
    text: 'Maintenance request AF-0055 approved',
    time: '18m ago',
    read: false,
    category: 'approvals',
    indicator: 'green'
  },
  {
    id: 3,
    text: 'Booking confirmed : Room B2 : 2:00 to 3:00 PM',
    time: '1h ago',
    read: true,
    category: 'bookings',
    indicator: 'blue'
  },
  {
    id: 4,
    text: 'Transfer approved : AF-0033 to facilities dept',
    time: '3h ago',
    read: true,
    category: 'approvals',
    indicator: 'red'
  },
  {
    id: 5,
    text: 'Overdue return : AF-0021 was due 3 days ago',
    time: '1d ago',
    read: false,
    category: 'alerts',
    indicator: 'orange'
  },
  {
    id: 6,
    text: 'audit discrepancy flagged : AF-0088 damaged',
    time: '2d ago',
    read: false,
    category: 'alerts',
    indicator: 'orange'
  }
];

export const mockActivityLog = [
  { id: 1, actor: 'Admin', action: 'Approved transfer', entity: 'AF-0033', timestamp: '2026-07-09 14:20' },
  { id: 2, actor: 'A. Rao', action: 'Flagged discrepancy', entity: 'AF-0088', timestamp: '2026-07-10 09:05' }
];