"""AssetFlow — Asset schemas (Track B)."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AllocationStatus, AssetCondition, AssetStatus, MaintenancePriority, MaintenanceStatus


class AssetCreate(BaseModel):
    name: str
    category_id: uuid.UUID
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: AssetCondition | None = AssetCondition.GOOD
    location: str | None = None
    photo_url: str | None = None
    is_bookable: bool = False
    custom_values: dict = Field(default_factory=dict)


class AssetUpdate(BaseModel):
    name: str | None = None
    category_id: uuid.UUID | None = None
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: AssetCondition | None = None
    location: str | None = None
    photo_url: str | None = None
    is_bookable: bool | None = None
    custom_values: dict | None = None
    status: AssetStatus | None = None


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_tag: str
    name: str
    category_id: uuid.UUID
    serial_number: str | None
    acquisition_date: date | None
    acquisition_cost: Decimal | None
    condition: AssetCondition
    location: str | None
    photo_url: str | None
    is_bookable: bool
    custom_values: dict
    status: AssetStatus
    created_at: datetime
    updated_at: datetime


class AllocationHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    holder_user_id: uuid.UUID | None
    holder_department_id: uuid.UUID | None
    allocated_at: datetime
    expected_return_date: date | None
    returned_at: datetime | None
    return_condition_notes: str | None
    status: AllocationStatus


class MaintenanceHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    issue_description: str
    priority: MaintenancePriority
    status: MaintenanceStatus
    technician_name: str | None
    created_at: datetime
    resolved_at: datetime | None


class AssetDetail(AssetOut):
    # Populated by the service using SQLAlchemy relationship loading
    allocations: list[AllocationHistoryItem] = Field(default_factory=list)
    maintenance_requests: list[MaintenanceHistoryItem] = Field(default_factory=list)
