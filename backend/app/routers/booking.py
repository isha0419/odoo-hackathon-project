"""AssetFlow — Booking router (calendar, create, cancel, reschedule)."""

from fastapi import APIRouter

router = APIRouter(prefix="/bookings", tags=["bookings"])
