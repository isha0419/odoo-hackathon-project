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

    Called at the top of GET /dashboard and GET /notifications so the demo
    always shows live overdue/reminder items without a cron job.

    TODO: Fill in Stage 4 — find overdue allocations + upcoming bookings
    lacking notifications and create them.
    """
    pass  # Stub — filled by Omm in Stage 4
