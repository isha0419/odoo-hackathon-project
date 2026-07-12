import { api, ApiError } from './client';

export const bookingsApi = {
  list: (params) => api.get('/bookings', params),
  create: (data) => api.post('/bookings', data),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
  reschedule: (id, newStart, newEnd) =>
    api.post(`/bookings/${id}/reschedule`, { new_start: newStart, new_end: newEnd }),
};

/** True when the error is the crown-jewel #2 booking-overlap 409 conflict. */
export function isBookingConflict(err) {
  return err instanceof ApiError && err.status === 409 && err.body?.error === 'booking_overlap';
}
