import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import Calendar from '../components/Calendar/Calendar';
import { mockBooking } from '../data/booking';
import './Booking.css';

// Screen 6 — Resource Booking
// Owner: Isha
// TODO(Isha): replace mockBooking with api.get(`/resources/${id}/bookings`)
// and wire the "Book a slot" form + 409 conflict handling from api.post(...).
export default function Booking() {
  const { resource, date, hours, slots } = mockBooking;

  return (
    <div className="booking">
      <Card>
        <h3 className="booking__resource">
          {resource} — {date}
        </h3>
        <Calendar hours={hours} slots={slots} onSlotClick={() => {}} />
        <Button variant="primary" className="booking__book-btn">
          Book a slot
        </Button>
      </Card>
    </div>
  );
}