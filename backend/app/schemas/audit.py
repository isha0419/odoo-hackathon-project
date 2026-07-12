"""AssetFlow — Audit schemas (Track D)."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AuditCycleStatus, AuditVerification


class AuditCycleCreate(BaseModel):
    name: str
    scope_department_id: uuid.UUID | None = None
    scope_location: str | None = None
    start_date: date
    end_date: date


class AuditItemUpdate(BaseModel):
    verification: AuditVerification
    notes: str | None = None


class AssignAuditorsRequest(BaseModel):
    user_ids: list[uuid.UUID]


class AssetBase(BaseModel):
    id: uuid.UUID
    asset_tag: str
    name: str


class AuditItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audit_cycle_id: uuid.UUID
    asset_id: uuid.UUID
    expected_location: str | None
    verification: AuditVerification
    verified_by: uuid.UUID | None
    verified_at: datetime | None
    notes: str | None

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
    scope_department_id: uuid.UUID | None
    scope_location: str | None
    start_date: date
    end_date: date
    status: AuditCycleStatus
    created_at: datetime
    updated_at: datetime

    auditors: list[AuditCycleAuditorOut] = []

    # Custom counts added by service
    pending_count: int = 0
    verified_count: int = 0
    missing_count: int = 0
    damaged_count: int = 0


class DiscrepancyReport(BaseModel):
    cycle_id: uuid.UUID
    cycle_name: str
    discrepancies: list[AuditItemOut]
