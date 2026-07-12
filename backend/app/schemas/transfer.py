"""AssetFlow — Transfer schemas (Track B)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import TransferStatus


class TransferCreate(BaseModel):
    asset_id: uuid.UUID
    to_user_id: uuid.UUID
    reason: Optional[str] = None


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
    reason: Optional[str]
    status: TransferStatus
    approved_by: Optional[uuid.UUID]
    created_at: datetime
    resolved_at: Optional[datetime]

    asset: AssetBase
    from_user: UserBase
    to_user: UserBase
