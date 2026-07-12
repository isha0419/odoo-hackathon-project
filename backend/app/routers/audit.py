"""AssetFlow — Audit Router."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit import (
    AssignAuditorsRequest,
    AuditCycleCreate,
    AuditCycleOut,
    AuditItemOut,
    AuditItemUpdate,
    DiscrepancyReport,
)
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.post("", response_model=AuditCycleOut)
def create_audit_cycle(
    data: AuditCycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return audit_service.create_cycle(db, data, current_user.id)


@router.get("", response_model=list[AuditCycleOut])
def list_audit_cycles(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return audit_service.list_cycles(db, limit, offset)


@router.get("/{cycle_id}", response_model=AuditCycleOut)
def get_audit_cycle(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return audit_service.get_cycle(db, cycle_id)


@router.post("/{cycle_id}/assign", response_model=AuditCycleOut)
def assign_auditors(
    cycle_id: uuid.UUID,
    data: AssignAuditorsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return audit_service.assign_auditors(db, cycle_id, data, current_user.id)


@router.post("/items/{item_id}/mark", response_model=AuditItemOut)
def mark_audit_item(
    item_id: uuid.UUID,
    data: AuditItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only assigned auditors can mark, service checks this
    return audit_service.mark_item(db, item_id, data, current_user.id)


@router.post("/{cycle_id}/close", response_model=AuditCycleOut)
def close_audit_cycle(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return audit_service.close_cycle(db, cycle_id, current_user.id)


@router.get("/{cycle_id}/discrepancies", response_model=DiscrepancyReport)
def get_discrepancies(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return audit_service.get_discrepancies(db, cycle_id)
