// Mock shape for GET /dashboard — swap for a real api.get('/dashboard') call
// once the backend endpoint is ready. Keep this shape in sync with the API contract.
export const mockDashboard = {
  // Labels intentionally match the mockup wording exactly (including the
  // repeated "Available" label on the 3rd card, which the mockup uses for
  // assets currently flagged/unavailable-pending — confirm exact meaning
  // with the backend contract before wiring the real endpoint).
  kpis: {
    available: 128,
    allocated: 76,
    availableSecondary: 4,
    activeBookings: 9,
    pendingTransfers: 3,
    upcomingReturns: 12,
  },
  overdueReturnsCount: 3,
  recentActivity: [
    { id: 1, text: 'Laptop AF-0114 allocated to Priya Shah — IT dept' },
    { id: 2, text: 'Room B2 booking confirmed — 2:00 to 3:00 PM' },
    { id: 3, text: 'Projector AF-0062 maintenance resolved' },
  ],
};