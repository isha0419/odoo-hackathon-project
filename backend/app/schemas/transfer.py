"""AssetFlow — Transfer schemas (Track B)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import TransferStatus


class TransferCreate(BaseModel):
    asset_id: uuid.UUID
    to_user_id: uuid.UUID
    reason: str | None = None


class UserBase(BaseModel):
    id: uuid.UUID
    name: str
    email: str


class AssetBase(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str


class TransferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    requested_by: uuid.UUID
    reason: str | None
    status: TransferStatus
    approved_by: uuid.UUID | None
    created_at: datetime
    resolved_at: datetime | None

    asset: AssetBase
    from_user: UserBase
    to_user: UserBase
