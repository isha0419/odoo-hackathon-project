"""AssetFlow — Maintenance schemas (Track C)."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import MaintenancePriority, MaintenanceStatus


class MaintenanceCreate(BaseModel):
    asset_id: uuid.UUID
    issue_description: str
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    photo_url: Optional[str] = None


class MaintenanceTransition(BaseModel):
    to_status: MaintenanceStatus
    technician_name: Optional[str] = None


class UserBase(BaseModel):
    id: uuid.UUID
    name: str


class AssetBase(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str


class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    raised_by: uuid.UUID
    issue_description: str
    priority: MaintenancePriority
    photo_url: Optional[str]
    status: MaintenanceStatus
    approved_by: Optional[uuid.UUID]
    technician_name: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    asset: AssetBase
    raiser: UserBase
