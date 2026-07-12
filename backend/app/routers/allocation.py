"""AssetFlow — Allocations Router."""

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.allocation import AllocateRequest, AllocationOut, ReturnRequest
from app.services import allocation_service
from app.services.allocation_service import AssetAlreadyAllocatedError

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.post("", response_model=AllocationOut)
def allocate_asset(
    data: AllocateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)),
):
    try:
        return allocation_service.allocate(db, data, current_user.id)
    except AssetAlreadyAllocatedError as e:
        return JSONResponse(status_code=409, content=e.conflict_body)


@router.post("/{allocation_id}/return", response_model=AllocationOut)
def return_asset(
    allocation_id: uuid.UUID,
    data: ReturnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)),
):
    return allocation_service.return_asset(db, allocation_id, data.return_condition_notes, current_user.id)


@router.get("", response_model=list[AllocationOut])
def list_allocations(
    overdue: bool = False,
    holder_user_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return allocation_service.list_allocations(
        db=db,
        overdue=overdue,
        holder_user_id=holder_user_id,
        limit=limit,
        offset=offset,
    )
