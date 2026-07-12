"""AssetFlow — Activity Log schemas (Track D)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    id: uuid.UUID
    name: str


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: uuid.UUID
    action: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    metadata_: dict
    created_at: datetime

    actor: UserBase
