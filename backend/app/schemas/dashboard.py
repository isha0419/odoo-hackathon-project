"""AssetFlow — Dashboard schemas (Track D)."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ActivityLogBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: uuid.UUID
    action: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    created_at: datetime
    metadata_: dict


class AllocationBasic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    expected_return_date: date | None


class DashboardKPIs(BaseModel):
    assets_available: int
    assets_allocated: int
    maintenance_today: int
    active_bookings: int
    pending_transfers: int
    upcoming_returns: list[AllocationBasic]
    overdue_returns: list[AllocationBasic]
    recent_activity: list[ActivityLogBase]
