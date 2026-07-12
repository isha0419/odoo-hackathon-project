"""AssetFlow — Booking Service (Track C, CJ#2)."""

import uuid
from datetime import datetime

from fastapi import HTTPException
from psycopg2.extras import DateTimeTZRange
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.asset import Asset
from app.models.booking import Booking
from app.models.enums import BookingStatus, NotificationType
from app.schemas.booking import BookingCreate
from app.services import activity_service, notifications_service


class BookingOverlapError(Exception):
    def __init__(self, conflict_body: dict):
        self.conflict_body = conflict_body


def create(db: Session, data: BookingCreate, actor_id: uuid.UUID) -> Booking:
    asset = db.scalar(select(Asset).where(Asset.id == data.asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.is_bookable:
        raise HTTPException(status_code=422, detail="Asset is not bookable")

    if data.start >= data.end:
        raise HTTPException(status_code=422, detail="Start time must be before end time")

    requested_range = DateTimeTZRange(data.start, data.end, "[)")

    # Pre-check overlap
    overlapping = db.scalar(
        select(Booking).where(
            Booking.asset_id == data.asset_id,
            Booking.status != BookingStatus.CANCELLED,
            Booking.time_range.op("&&")(requested_range),
        )
    )

    if overlapping:
        conflict_body = {
            "error": "booking_overlap",
            "message": "Slot unavailable — overlaps an existing booking.",
            "conflicting_booking": {
                "id": str(overlapping.id),
                "start": overlapping.time_range.lower.isoformat() if overlapping.time_range.lower else None,
                "end": overlapping.time_range.upper.isoformat() if overlapping.time_range.upper else None,
            },
        }
        raise BookingOverlapError(conflict_body=conflict_body)

    booking = Booking(
        asset_id=data.asset_id,
        booked_by_user_id=actor_id,
        department_id=data.department_id,
        time_range=requested_range,
        status=BookingStatus.UPCOMING,
    )
    db.add(booking)
    db.flush()

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="booking.created",
        entity_type="booking",
        entity_id=booking.id,
    )

    notifications_service.create(
        db=db,
        recipient_id=actor_id,
        type=NotificationType.BOOKING_CONFIRMED,
        message=f"Booking confirmed for {asset.name} from {data.start.strftime('%Y-%m-%d %H:%M')}.",
        entity_type="booking",
        entity_id=booking.id,
    )

    db.commit()
    db.refresh(booking)
    return get_detail(db, booking.id)


def get_detail(db: Session, booking_id: uuid.UUID) -> Booking:
    booking = db.scalar(
        select(Booking)
        .options(joinedload(Booking.asset), joinedload(Booking.booked_by))
        .where(Booking.id == booking_id)
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def cancel(db: Session, booking_id: uuid.UUID, actor_id: uuid.UUID) -> Booking:
    booking = get_detail(db, booking_id)
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=422, detail="Booking already cancelled")

    booking.status = BookingStatus.CANCELLED
    db.add(booking)

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="booking.cancelled",
        entity_type="booking",
        entity_id=booking.id,
    )

    notifications_service.create(
        db=db,
        recipient_id=booking.booked_by_user_id,
        type=NotificationType.BOOKING_CANCELLED,
        message=f"Your booking for {booking.asset.name} was cancelled.",
        entity_type="booking",
        entity_id=booking.id,
    )

    db.commit()
    db.refresh(booking)
    return booking


def reschedule(
    db: Session, booking_id: uuid.UUID, new_start: datetime, new_end: datetime, actor_id: uuid.UUID
) -> Booking:
    # 1. Get old booking
    old_booking = get_detail(db, booking_id)

    if old_booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=422, detail="Cannot reschedule a cancelled booking")

    # 2. Cancel old booking (don't commit yet to keep it atomic)
    old_booking.status = BookingStatus.CANCELLED
    db.add(old_booking)
    db.flush()

    # 3. Create new booking
    new_data = BookingCreate(
        asset_id=old_booking.asset_id,
        start=new_start,
        end=new_end,
        department_id=old_booking.department_id,
    )

    # We call create() which handles the overlap check and creation.
    # Note: create() also commits. So we must ensure it behaves atomically.
    # Actually, create() does db.commit(). So our cancellation would be committed along with it!
    # Let's inline the creation logic or modify create to not commit?
    # Calling create() directly is fine since it commits the transaction that we already added old_booking to.

    try:
        new_booking = create(db, new_data, actor_id)
        return new_booking
    except Exception as e:
        # If create fails (e.g. overlap), the transaction will be rolled back by the caller,
        # but create() doesn't rollback explicitly, so we just raise.
        raise e


def list_bookings(
    db: Session,
    asset_id: uuid.UUID | None = None,
    date_val: datetime | None = None,  # Can be used to filter a specific day
    limit: int = 50,
    offset: int = 0,
) -> list[Booking]:
    stmt = select(Booking).options(
        joinedload(Booking.asset),
        joinedload(Booking.booked_by),
    )

    if asset_id:
        stmt = stmt.where(Booking.asset_id == asset_id)

    # Example logic for date filter if needed, could use time_range boundaries

    stmt = stmt.order_by(Booking.created_at.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()
