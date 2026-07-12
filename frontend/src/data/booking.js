// Mock shape for GET /resources/:id/bookings — swap for a real call later.
export const mockBooking = {
  resource: 'Conference Room B2',
  date: 'Tue, 7 Jul',
  hours: ['9:00', '10:00', '11:00', '12:00', '1:00'],
  slots: [
    { id: 1, start: '9:00', end: '10:00', label: 'Booked — Procurement Team', state: 'booked' },
    { id: 2, start: '10:00', end: '11:00', label: 'Requested 9:30–10:30 — conflict', state: 'conflict' },
  ],
};