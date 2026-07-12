"""AssetFlow — Audit schemas (Track D)."""

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditStatus, AuditVerification


class AuditCycleCreate(BaseModel):
    name: str
    scope_department_id: Optional[uuid.UUID] = None
    scope_location: Optional[str] = None
    start_date: date
    end_date: date


class AuditItemUpdate(BaseModel):
    verification: AuditVerification
    notes: Optional[str] = None


class AssignAuditorsRequest(BaseModel):
    user_ids: List[uuid.UUID]


class AssetBase(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str


class AuditItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audit_cycle_id: uuid.UUID
    asset_id: uuid.UUID
    expected_location: Optional[str]
    verification: AuditVerification
    verified_by: Optional[uuid.UUID]
    verified_at: Optional[datetime]
    notes: Optional[str]

    asset: AssetBase


class UserBase(BaseModel):
    id: uuid.UUID
    name: str


class AuditCycleAuditorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: UserBase


class AuditCycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    scope_department_id: Optional[uuid.UUID]
    scope_location: Optional[str]
    start_date: date
    end_date: date
    status: AuditStatus
    created_at: datetime
    updated_at: datetime

    auditors: List[AuditCycleAuditorOut] = []
    
    # Custom counts added by service
    pending_count: int = 0
    verified_count: int = 0
    missing_count: int = 0
    damaged_count: int = 0


class DiscrepancyReport(BaseModel):
    cycle_id: uuid.UUID
    cycle_name: str
    discrepancies: List[AuditItemOut]
