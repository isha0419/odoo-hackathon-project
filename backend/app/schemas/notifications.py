"""AssetFlow — Notifications schemas (Track D)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recipient_user_id: Optional[uuid.UUID]
    type: NotificationType
    message: str
    entity_type: Optional[str]
    entity_id: Optional[uuid.UUID]
    is_read: bool
    created_at: datetime
