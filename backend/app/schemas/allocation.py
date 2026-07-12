"""AssetFlow — Allocation schemas (Track B)."""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import AllocationStatus


class AllocateRequest(BaseModel):
    asset_id: uuid.UUID
    holder_user_id: Optional[uuid.UUID] = None
    holder_department_id: Optional[uuid.UUID] = None
    expected_return_date: Optional[date] = None


class ReturnRequest(BaseModel):
    return_condition_notes: Optional[str] = None


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
    holder_user_id: Optional[uuid.UUID]
    holder_department_id: Optional[uuid.UUID]
    allocated_by: uuid.UUID
    allocated_at: datetime
    expected_return_date: Optional[date]
    returned_at: Optional[datetime]
    return_condition_notes: Optional[str]
    status: AllocationStatus

    # Nested representation
    asset: AssetBase
    holder: Optional[UserBase]
    holder_department: Optional[DepartmentBase]
