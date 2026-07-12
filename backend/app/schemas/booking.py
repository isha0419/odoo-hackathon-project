"""AssetFlow — Booking schemas (Track C)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.enums import BookingStatus


class BookingCreate(BaseModel):
    asset_id: uuid.UUID
    start: datetime
    end: datetime
    department_id: uuid.UUID | None = None


class UserBase(BaseModel):
    id: uuid.UUID
    name: str


class AssetBase(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    booked_by_user_id: uuid.UUID
    department_id: uuid.UUID | None
    status: BookingStatus
    created_at: datetime
    updated_at: datetime

    asset: AssetBase
    booked_by: UserBase

    time_range: Any = Field(exclude=True)

    @computed_field
    @property
    def start(self) -> datetime:
        if self.time_range and hasattr(self.time_range, "lower"):
            return self.time_range.lower
        return datetime.now()  # Fallback

    @computed_field
    @property
    def end(self) -> datetime:
        if self.time_range and hasattr(self.time_range, "upper"):
            return self.time_range.upper
        return datetime.now()

    @computed_field
    @property
    def temporal_status(self) -> str:
        if self.status == BookingStatus.CANCELLED:
            return "CANCELLED"

        now = datetime.now(self.start.tzinfo if self.start else None)
        if now < self.start:
            return "UPCOMING"
        elif self.start <= now < self.end:
            return "ONGOING"
        else:
            return "COMPLETED"
