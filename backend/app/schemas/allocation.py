"""AssetFlow — Allocation schemas (Track B)."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AllocationStatus


class AllocateRequest(BaseModel):
    asset_id: uuid.UUID
    holder_user_id: uuid.UUID | None = None
    holder_department_id: uuid.UUID | None = None
    expected_return_date: date | None = None


class ReturnRequest(BaseModel):
    return_condition_notes: str | None = None


class UserBase(BaseModel):
    id: uuid.UUID
    name: str
    email: str


class DepartmentBase(BaseModel):
    id: uuid.UUID
    name: str


class AssetBase(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str


class AllocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    holder_user_id: uuid.UUID | None
    holder_department_id: uuid.UUID | None
    allocated_by: uuid.UUID
    allocated_at: datetime
    expected_return_date: date | None
    returned_at: datetime | None
    return_condition_notes: str | None
    status: AllocationStatus

    # Nested representation
    asset: AssetBase
    holder: UserBase | None
    holder_department: DepartmentBase | None
