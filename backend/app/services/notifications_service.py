"""
AssetFlow — Notifications helper (shared across all tracks).

Signatures are FROZEN — all tracks import and call these.
Omm (A) fills sync_derived() in Stage 4.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.enums import NotificationType


def create(
    db: Session,
    recipient_id: uuid.UUID | None,
    type: NotificationType,
    message: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> Notification:
    """Create an event-driven notification. Called by services on state changes."""
    notif = Notification(
        recipient_user_id=recipient_id,
        type=type,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    db.flush()
    return notif


def sync_derived(db: Session) -> None:
    """
    Compute derived notifications (OVERDUE_RETURN, BOOKING_REMINDER).
    Idempotent.
    """
    from datetime import date, datetime, timedelta
    from sqlalchemy import select
    from app.models.allocation import Allocation
    from app.models.booking import Booking
    from app.models.enums import AllocationStatus, BookingStatus

    today = date.today()
    now = datetime.now()
    thirty_mins_from_now = now + timedelta(minutes=30)

    # 1. Overdue Allocations
    overdue_allocs = db.scalars(
        select(Allocation).where(
            Allocation.status == AllocationStatus.ACTIVE,
            Allocation.expected_return_date < today
        )
    ).all()

    for alloc in overdue_allocs:
        # Check if notification exists
        existing = db.scalar(
            select(Notification).where(
                Notification.entity_id == alloc.id,
                Notification.type == NotificationType.OVERDUE_RETURN
            )
        )
        if not existing and alloc.holder_user_id:
            create(
                db=db,
                recipient_id=alloc.holder_user_id,
                type=NotificationType.OVERDUE_RETURN,
                message=f"Your allocation for asset {alloc.asset.name if alloc.asset else 'ID ' + str(alloc.asset_id)} is overdue.",
                entity_type="allocation",
                entity_id=alloc.id,
            )

    # 2. Upcoming Bookings (within 30 mins)
    # Using psycopg2.extras DateTimeTZRange requires some raw SQL or just fetching and checking
    # Because time_range contains timezone aware datetimes usually.
    # To keep it simple, fetch UPCOMING bookings and check Python-side if they start within 30 mins.
    upcoming_bookings = db.scalars(
        select(Booking).where(Booking.status == BookingStatus.UPCOMING)
    ).all()

    for booking in upcoming_bookings:
        start_time = booking.time_range.lower if booking.time_range else None
        if start_time:
            # ensure naive or aware comparison matches
            if start_time.tzinfo:
                now_aware = datetime.now(start_time.tzinfo)
                thirty_mins_aware = now_aware + timedelta(minutes=30)
                is_soon = now_aware <= start_time <= thirty_mins_aware
            else:
                is_soon = now <= start_time <= thirty_mins_from_now
            
            if is_soon:
                existing = db.scalar(
                    select(Notification).where(
                        Notification.entity_id == booking.id,
                        Notification.type == NotificationType.BOOKING_REMINDER
                    )
                )
                if not existing:
                    create(
                        db=db,
                        recipient_id=booking.booked_by_user_id,
                        type=NotificationType.BOOKING_REMINDER,
                        message=f"Reminder: You have a booking starting at {start_time.strftime('%H:%M')}.",
                        entity_type="booking",
                        entity_id=booking.id,
                    )
    
    db.commit()
