"""AssetFlow — Transfers Router."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.enums import TransferStatus, UserRole
from app.models.user import User
from app.schemas.transfer import TransferCreate, TransferOut
from app.services import transfer_service

router = APIRouter(prefix="/transfers", tags=["Transfers"])


@router.post("", response_model=TransferOut)
def request_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return transfer_service.create(db, data, current_user.id)


@router.get("", response_model=List[TransferOut])
def list_transfers(
    status: Optional[TransferStatus] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    # Department Head only sees their department's transfers
    dept_id = None
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        dept_id = current_user.department_id

    return transfer_service.list_transfers(
        db=db,
        status=status,
        department_id=dept_id,
        limit=limit,
        offset=offset,
    )


@router.post("/{transfer_id}/approve", response_model=TransferOut)
def approve_transfer(
    transfer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    return transfer_service.approve(db, transfer_id, current_user.id)


@router.post("/{transfer_id}/reject", response_model=TransferOut)
def reject_transfer(
    transfer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    return transfer_service.reject(db, transfer_id, current_user.id)
