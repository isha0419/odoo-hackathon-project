import { useCallback, useEffect, useMemo, useState } from 'react';
import { assetsApi } from '../api/assets';
import { bookingsApi, isBookingConflict } from '../api/bookings';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isDeptHeadPlus } from '../utils/roles';
import { formatDate, formatTime } from '../utils/format';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import './ResourceBooking.css';

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const PX_PER_HOUR = 56;

function toLocalDateInput(date) {
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function offsetFor(dateObj) {
  const hours = dateObj.getHours() + dateObj.getMinutes() / 60;
  return Math.max(0, (hours - DAY_START_HOUR) * PX_PER_HOUR);
}

export default function ResourceBooking() {
  const { user } = useAuth();

  const [resources, setResources] = useState([]);
  const [assetId, setAssetId] = useState('');
  const [date, setDate] = useState(toLocalDateInput(new Date()));

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [booking, setBooking] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    assetsApi
      .list({ is_bookable: true, limit: 100 })
      .then((list) => {
        setResources(list);
        if (list.length && !assetId) setAssetId(list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load bookable resources.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = useCallback(() => {
    if (!assetId) return;
    setLoading(true);
    setError('');
    bookingsApi
      .list({ asset_id: assetId, limit: 100 })
      .then(setBookings)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load bookings.'))
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(loadBookings, [loadBookings]);

  const dayBookings = useMemo(
    () =>
      bookings.filter((b) => b.status !== 'CANCELLED' && toLocalDateInput(b.start) === date),
    [bookings, date],
  );

  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) hours.push(h);

  async function handleBook(e) {
    e.preventDefault();
    setBooking(true);
    setConflict(null);
    setNotice('');
    setError('');
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (start >= end) {
      setError('Start time must be before end time.');
      setBooking(false);
      return;
    }
    try {
      await bookingsApi.create({ asset_id: assetId, start: start.toISOString(), end: end.toISOString() });
      setNotice('Slot booked.');
      loadBookings();
    } catch (err) {
      if (isBookingConflict(err)) {
        setConflict({ requestedStart: start, requestedEnd: end, ...err.body });
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not book this slot.');
      }
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel(bookingId) {
    setError('');
    try {
      await bookingsApi.cancel(bookingId);
      loadBookings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel booking.');
    }
  }

  const selectedResource = resources.find((r) => r.id === assetId);
  const canManageAny = isDeptHeadPlus(user);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Resource Booking</h1>
          <p className="page-subtitle">Book shared resources like rooms and vehicles by time slot.</p>
        </div>
      </div>

      <div className="filters-row">
        <select className="input" style={{ maxWidth: 280 }} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          {resources.length === 0 && <option value="">No bookable resources</option>}
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.asset_tag} — {r.name}
            </option>
          ))}
        </select>
        <input className="input" style={{ maxWidth: 180 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <Banner tone="danger">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {resources.length === 0 ? (
        <EmptyState title="No bookable resources yet" hint="Mark an asset as bookable from the Asset Registry to see it here." />
      ) : loading ? (
        <Spinner label="Loading calendar…" />
      ) : (
        <div className="booking-layout">
          <div className="card booking-calendar-card">
            <h2 className="section-title">
              {selectedResource?.name} — {formatDate(date)}
            </h2>
            <div className="booking-grid" style={{ height: (DAY_END_HOUR - DAY_START_HOUR + 1) * PX_PER_HOUR }}>
              {hours.map((h) => (
                <div key={h} className="booking-hour-row" style={{ height: PX_PER_HOUR }}>
                  <span className="booking-hour-label">{h}:00</span>
                </div>
              ))}

              {dayBookings.map((b) => {
                const start = new Date(b.start);
                const end = new Date(b.end);
                const top = offsetFor(start);
                const height = Math.max(20, offsetFor(end) - top);
                const canCancel = canManageAny || b.booked_by_user_id === user.id;
                return (
                  <div key={b.id} className="booking-block" style={{ top, height }} title={`${formatTime(b.start)} – ${formatTime(b.end)}`}>
                    <div className="booking-block-time">
                      {formatTime(b.start)}–{formatTime(b.end)}
                    </div>
                    <div className="booking-block-name">{b.booked_by.name}</div>
                    {canCancel && (
                      <button className="booking-block-cancel" onClick={() => handleCancel(b.id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}

              {conflict && toLocalDateInput(conflict.requestedStart) === date && (
                <div
                  className="booking-block booking-block-conflict"
                  style={{
                    top: offsetFor(conflict.requestedStart),
                    height: Math.max(20, offsetFor(conflict.requestedEnd) - offsetFor(conflict.requestedStart)),
                    left: '58%',
                    right: 8,
                  }}
                >
                  <div className="booking-block-time">
                    Requested {formatTime(conflict.requestedStart)}–{formatTime(conflict.requestedEnd)}
                  </div>
                  <div className="booking-block-name">conflict — unavailable</div>
                </div>
              )}
            </div>
          </div>

          <div className="card booking-form-card">
            <h2 className="section-title">Book a Slot</h2>
            {conflict && (
              <Banner tone="danger" title="Slot unavailable">
                Overlaps an existing booking ({formatTime(conflict.conflicting_booking.start)}–
                {formatTime(conflict.conflicting_booking.end)}). Choose a different time.
              </Banner>
            )}
            <form onSubmit={handleBook}>
              <div className="form-row">
                <div className="field">
                  <label>Start</label>
                  <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="field">
                  <label>End</label>
                  <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={booking || !assetId}>
                {booking ? 'Booking…' : 'Book a slot'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
