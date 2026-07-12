"""AssetFlow — Maintenance Router."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.enums import MaintenancePriority, MaintenanceStatus, UserRole
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceOut, MaintenanceTransition
from app.services import maintenance_service

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.post("", response_model=MaintenanceOut)
def raise_maintenance_request(
    data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return maintenance_service.raise_request(db, data, current_user.id)


@router.get("", response_model=List[MaintenanceOut])
def list_maintenance_requests(
    asset_id: Optional[uuid.UUID] = None,
    status: Optional[MaintenanceStatus] = None,
    priority: Optional[MaintenancePriority] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return maintenance_service.list_requests(
        db=db,
        asset_id=asset_id,
        status=status,
        priority=priority,
        limit=limit,
        offset=offset,
    )


@router.post("/{request_id}/transition", response_model=MaintenanceOut)
def transition_maintenance_request(
    request_id: uuid.UUID,
    data: MaintenanceTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return maintenance_service.transition(db, request_id, data, current_user.id)
