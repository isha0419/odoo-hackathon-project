import { useState, useMemo } from 'react';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Modal from '../components/Modal/Modal';
import Calendar from '../components/Calender/Calender';
import { mockBooking } from '../data/booking';
import './Booking.css';

// Screen 6 — Resource Booking
// Owner: Isha

const RESOURCES = [
  'Conference room B2 - Tue, 7 Jul',
  'Training Room A - Tue, 7 Jul',
  'Projector AF-0062 - Tue, 7 Jul',
  'Van AF-0114 - Tue, 7 Jul'
];

const HOURS = ['9:00', '10:00', '11:00', '12:00', '1:00'];

const INITIAL_BOOKINGS_MAP = {
  'Conference room B2 - Tue, 7 Jul': [
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
  ],
  'Training Room A - Tue, 7 Jul': [
    {
      id: 'b-3',
      start: '10:00',
      end: '11:00',
      label: 'Booked - Operations Team - 10 to 11',
      state: 'booked'
    }
  ],
  'Projector AF-0062 - Tue, 7 Jul': [],
  'Van AF-0114 - Tue, 7 Jul': [
    {
      id: 'b-4',
      start: '12:00',
      end: '1:00',
      label: 'Booked - Sales (Client visit) - 12 to 1',
      state: 'booked'
    }
  ]
};

// Helper to convert time string to numerical value for comparison
const timeToValue = (t) => {
  if (t === '1:00') return 13.0; // 1:00 PM is 13:00
  const parts = t.split(':');
  const h = parseFloat(parts[0]);
  const m = parts[1] ? parseFloat(parts[1]) / 60 : 0;
  return h + m;
};

export default function Booking() {
  const [selectedResource, setSelectedResource] = useState(RESOURCES[0]);
  const [bookingsMap, setBookingsMap] = useState(INITIAL_BOOKINGS_MAP);

  // Modal & Form state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [bookForm, setBookForm] = useState({
    team: '',
    start: '11:00',
    end: '12:00'
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Get bookings for current resource
  const currentSlots = useMemo(() => {
    return bookingsMap[selectedResource] || [];
  }, [bookingsMap, selectedResource]);

  const handleOpenBookModal = (prefilledStart = null) => {
    setBookForm({
      team: '',
      start: prefilledStart || '11:00',
      end: prefilledStart === '12:00' ? '1:00' : prefilledStart ? `${parseInt(prefilledStart) + 1}:00` : '12:00'
    });
    setIsBookModalOpen(true);
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!bookForm.team.trim()) {
      alert('Please enter a team or user name.');
      return;
    }

    const startVal = timeToValue(bookForm.start);
    const endVal = timeToValue(bookForm.end);

    if (endVal <= startVal) {
      alert('End time must be after start time.');
      return;
    }

    // Check for overlap conflict with existing "booked" slots
    const hasConflict = currentSlots.some((slot) => {
      if (slot.state !== 'booked') return false;
      const slotStart = timeToValue(slot.start);
      const slotEnd = timeToValue(slot.end);
      // Overlap formula: start1 < end2 AND start2 < end1
      return startVal < slotEnd && slotStart < endVal;
    });

    const newSlot = {
      id: `b-${Date.now()}`,
      start: bookForm.start,
      end: bookForm.end,
      label: hasConflict
        ? `Requested ${bookForm.start} to ${bookForm.end} - conflict - slot is unavailble`
        : `Booked - ${bookForm.team} - ${bookForm.start.split(':')[0]} to ${bookForm.end.split(':')[0]}`,
      state: hasConflict ? 'conflict' : 'booked'
    };

    setBookingsMap((prev) => ({
      ...prev,
      [selectedResource]: [...(prev[selectedResource] || []), newSlot]
    }));

    setIsBookModalOpen(false);

    if (hasConflict) {
      showToast('⚠️ Reservation conflict detected! Added as an unapproved conflict card.');
    } else {
      showToast(`✓ Room successfully booked for the ${bookForm.team}!`);
    }
  };

  return (
    <div className="booking-page">
      {/* Toast Popup */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--brand)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            color: 'var(--text-primary)',
            zIndex: 1000,
            fontSize: '0.95rem',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          {toast}
        </div>
      )}

      {/* Header Info */}
      <header className="booking-header">
        <h1 className="booking-title">Resource Booking</h1>
        <p className="booking-subtitle">Reserve rooms, vehicles, and shared equipment logs.</p>
      </header>

      {/* Labeled Resource Selector */}
      <div className="booking-resource-field">
        <span className="booking-resource-label">Resource</span>
        <select
          className="booking-resource-select"
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
        >
          {RESOURCES.map((res) => (
            <option key={res} value={res}>
              {res}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline Grid using corrected Calendar Component */}
      <Calendar
        hours={HOURS}
        slots={currentSlots}
        onSlotClick={(slot) => handleOpenBookModal(slot.start)}
      />

      {/* Action Button at bottom */}
      <div className="booking-actions">
        <button className="booking-book-btn" onClick={() => handleOpenBookModal()}>
          Book a slot
        </button>
      </div>

      {/* Booking Form Modal */}
      <Modal open={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} title="Book a Resource Slot">
        <form onSubmit={handleBookSubmit} className="maintenance-form">
          <div className="maintenance-field">
            <label htmlFor="booking-team" className="maintenance-label">
              Team / User Name
            </label>
            <input
              id="booking-team"
              type="text"
              placeholder="e.g. Procurement Team"
              className="org-tab-btn"
              style={{ width: '100%' }}
              value={bookForm.team}
              onChange={(e) => setBookForm({ ...bookForm, team: e.target.value })}
              required
            />
          </div>

          <div className="audit-form-row">
            <div className="maintenance-field">
              <label htmlFor="booking-start" className="maintenance-label">
                Start Time
              </label>
              <select
                id="booking-start"
                className="org-tab-btn"
                style={{ width: '100%' }}
                value={bookForm.start}
                onChange={(e) => setBookForm({ ...bookForm, start: e.target.value })}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
                <option value="9:30">9:30 (Simulate Conflict)</option>
              </select>
            </div>

            <div className="maintenance-field">
              <label htmlFor="booking-end" className="maintenance-label">
                End Time
              </label>
              <select
                id="booking-end"
                className="org-tab-btn"
                style={{ width: '100%' }}
                value={bookForm.end}
                onChange={(e) => setBookForm({ ...bookForm, end: e.target.value })}
              >
                {HOURS.map((h) => {
                  // Only allow ending later
                  if (timeToValue(h) <= timeToValue(bookForm.start)) return null;
                  return (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  );
                })}
                <option value="10:30">10:30 (Simulate Conflict)</option>
              </select>
            </div>
          </div>

          <div className="maintenance-form-actions">
            <Button variant="secondary" type="button" onClick={() => setIsBookModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}