"""AssetFlow — Maintenance schemas (Track C)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import MaintenancePriority, MaintenanceStatus


class MaintenanceCreate(BaseModel):
    asset_id: uuid.UUID
    issue_description: str
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    photo_url: str | None = None


class MaintenanceTransition(BaseModel):
    to_status: MaintenanceStatus
    technician_name: str | None = None


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
    photo_url: str | None
    status: MaintenanceStatus
    approved_by: uuid.UUID | None
    technician_name: str | None
    created_at: datetime
    resolved_at: datetime | None

    asset: AssetBase
    raiser: UserBase
