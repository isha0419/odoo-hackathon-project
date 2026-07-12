"""AssetFlow — Notifications schemas (Track D)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recipient_user_id: uuid.UUID | None
    type: NotificationType
    message: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    is_read: bool
    created_at: datetime
