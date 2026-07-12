"""AssetFlow — Organization schemas (departments, categories, employees)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ActiveStatus, UserRole

# ── Departments ───────────────────────────────────────────────────────────────


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    head_user_id: uuid.UUID | None = None
    parent_department_id: uuid.UUID | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    head_user_id: uuid.UUID | None = None
    parent_department_id: uuid.UUID | None = None
    status: ActiveStatus | None = None


class DepartmentOut(BaseModel):
    id: uuid.UUID
    name: str
    head_user_id: uuid.UUID | None = None
    head_name: str | None = None
    parent_department_id: uuid.UUID | None = None
    parent_name: str | None = None
    status: ActiveStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Categories ────────────────────────────────────────────────────────────────


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    custom_fields: dict = Field(default_factory=dict)


class CategoryUpdate(BaseModel):
    name: str | None = None
    custom_fields: dict | None = None


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    custom_fields: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Employees ─────────────────────────────────────────────────────────────────


class EmployeeUpdate(BaseModel):
    """Admin-only: the ONLY place roles change."""

    role: UserRole | None = None
    department_id: uuid.UUID | None = None
    status: ActiveStatus | None = None


class EmployeeOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    department_id: uuid.UUID | None = None
    department_name: str | None = None
    status: ActiveStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
