"""AssetFlow — Booking Router."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingOut
from app.services import booking_service
from app.services.booking_service import BookingOverlapError

router = APIRouter(prefix="/bookings", tags=["Bookings"])


class RescheduleRequest(BaseModel):
    new_start: datetime
    new_end: datetime


def _check_booking_ownership(booking, current_user: User):
    if (
        current_user.role not in (UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
        and booking.booked_by_user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not authorized to modify this booking")


@router.post("", response_model=BookingOut)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return booking_service.create(db, data, current_user.id)
    except BookingOverlapError as e:
        return JSONResponse(status_code=409, content=e.conflict_body)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = booking_service.get_detail(db, booking_id)
    _check_booking_ownership(booking, current_user)
    return booking_service.cancel(db, booking_id, current_user.id)


@router.post("/{booking_id}/reschedule", response_model=BookingOut)
def reschedule_booking(
    booking_id: uuid.UUID,
    data: RescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = booking_service.get_detail(db, booking_id)
    _check_booking_ownership(booking, current_user)

    try:
        return booking_service.reschedule(db, booking_id, data.new_start, data.new_end, current_user.id)
    except BookingOverlapError as e:
        return JSONResponse(status_code=409, content=e.conflict_body)


@router.get("", response_model=list[BookingOut])
def list_bookings(
    asset_id: uuid.UUID | None = None,
    date: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return booking_service.list_bookings(
        db=db,
        asset_id=asset_id,
        date=date,
        limit=limit,
        offset=offset,
    )
