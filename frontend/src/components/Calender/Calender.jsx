import './Calender.css';

/**
 * Renders a vertical time-slot grid for a single resource/day.
 * slots: [{ id, start, end, label, state }] where state is
 * 'booked' | 'conflict' | 'free'
 * onSlotClick(slot) fires when a free slot is clicked.
 */
export default function Calendar({ hours, slots = [], onSlotClick }) {
  return (
    <div className="calendar">
      {hours.map((hour) => {
        const slot = slots.find((s) => s.start === hour);
        return (
          <div key={hour} className="calendar__row">
            <span className="calendar__time">{hour}</span>
            <div className="calendar__track">
              {slot ? (
                <button
                  className={`calendar__slot calendar__slot--${slot.state}`}
                  onClick={() => slot.state === 'free' && onSlotClick?.(slot)}
                >
                  {slot.label}
                </button>
              ) : (
                <button className="calendar__slot calendar__slot--free" onClick={() => onSlotClick?.({ start: hour })} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}