"""AssetFlow — Asset schemas (Track B)."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AssetCondition, AssetStatus


class AssetCreate(BaseModel):
    name: str
    category_id: uuid.UUID
    serial_number: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[Decimal] = None
    condition: Optional[AssetCondition] = AssetCondition.GOOD
    location: Optional[str] = None
    photo_url: Optional[str] = None
    is_bookable: bool = False
    custom_values: dict = Field(default_factory=dict)


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    serial_number: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[Decimal] = None
    condition: Optional[AssetCondition] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    is_bookable: Optional[bool] = None
    custom_values: Optional[dict] = None
    status: Optional[AssetStatus] = None


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_tag: str
    name: str
    category_id: uuid.UUID
    serial_number: Optional[str]
    acquisition_date: Optional[date]
    acquisition_cost: Optional[Decimal]
    condition: AssetCondition
    location: Optional[str]
    photo_url: Optional[str]
    is_bookable: bool
    custom_values: dict
    status: AssetStatus
    created_at: datetime
    updated_at: datetime


class AssetDetail(AssetOut):
    # These will be populated by the service using SQLAlchemy relationship loading
    allocations: List[Any] = Field(default_factory=list)
    maintenance_requests: List[Any] = Field(default_factory=list)
