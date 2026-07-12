"""
AssetFlow — Activity log helper (shared across all tracks).

Signature is FROZEN — all tracks import and call this.
Omm (A) fills the body in Stage 4.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog


def log(
    db: Session,
    actor_id: uuid.UUID,
    action: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> ActivityLog:
    """Write one activity_logs row. Called by every state-changing service."""
    entry = ActivityLog(
        actor_user_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_=metadata or {},
    )
    db.add(entry)
    db.flush()
    return entry
