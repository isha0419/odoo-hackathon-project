// src/data/booking.js
// Mock data for the Resource Booking screen (Screen 6).

export const mockBooking = {
  resource: 'Conference room B2 - Tue, 7 Jul',
  date: 'Tue, 7 Jul',
  hours: ['9:00', '10:00', '11:00', '12:00', '1:00'],
  slots: [
    {
      id: 'b-1',
      start: '9:00',
      end: '10:00',
      label: 'Booked - Procurement Team - 9 to 10',
      state: 'booked'
    },
    {
      id: 'b-2',
      start: '10:00',
      end: '11:00',
      label: 'Requested 9:30 to 10:30 - conflict - slot is unavailble',
      state: 'conflict'
    }
  ]
};