"""AssetFlow — Dashboard schemas (Track D)."""

import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict


class ActivityLogBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: uuid.UUID
    action: str
    entity_type: Optional[str]
    entity_id: Optional[uuid.UUID]
    created_at: datetime
    metadata_: dict


class AllocationBasic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    expected_return_date: Optional[date]


class DashboardKPIs(BaseModel):
    assets_available: int
    assets_allocated: int
    maintenance_today: int
    active_bookings: int
    pending_transfers: int
    upcoming_returns: List[AllocationBasic]
    overdue_returns: List[AllocationBasic]
    recent_activity: List[ActivityLogBase]
