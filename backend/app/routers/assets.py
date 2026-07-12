"""AssetFlow — Assets Router."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.enums import AssetStatus, UserRole
from app.models.user import User
from app.schemas.assets import AssetCreate, AssetDetail, AssetOut, AssetUpdate
from app.services import asset_service

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.post("", response_model=AssetOut)
def register_asset(
    data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return asset_service.register(db, data, current_user.id)


@router.get("", response_model=list[AssetOut])
def list_assets(
    q: str | None = None,
    category_id: uuid.UUID | None = None,
    status: AssetStatus | None = None,
    department_id: uuid.UUID | None = None,
    location: str | None = None,
    is_bookable: bool | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return asset_service.list_assets(
        db=db,
        q=q,
        category_id=category_id,
        status=status,
        department_id=department_id,
        location=location,
        is_bookable=is_bookable,
        limit=limit,
        offset=offset,
    )


@router.get("/{asset_id}", response_model=AssetDetail)
def get_asset(
    asset_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return asset_service.get_detail(db, asset_id)


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: uuid.UUID,
    data: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    return asset_service.update(db, asset_id, data, current_user.id)
