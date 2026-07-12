"""AssetFlow — Asset Service (Track B)."""

import uuid

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.enums import AllocationStatus, AssetStatus
from app.schemas.assets import AssetCreate, AssetUpdate
from app.services import activity_service


def register(db: Session, data: AssetCreate, actor_id: uuid.UUID) -> Asset:
    tag_result = db.execute(select(func.nextval("asset_tag_seq"))).scalar()
    asset_tag = f"AF-{tag_result:04d}"

    db_asset = Asset(
        asset_tag=asset_tag,
        name=data.name,
        category_id=data.category_id,
        serial_number=data.serial_number,
        acquisition_date=data.acquisition_date,
        acquisition_cost=data.acquisition_cost,
        condition=data.condition,
        location=data.location,
        photo_url=data.photo_url,
        is_bookable=data.is_bookable,
        custom_values=data.custom_values,
        status=AssetStatus.AVAILABLE,
    )
    db.add(db_asset)
    db.flush()

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="asset.registered",
        entity_type="asset",
        entity_id=db_asset.id,
        metadata={"asset_tag": asset_tag},
    )
    db.commit()
    db.refresh(db_asset)
    return db_asset


def list_assets(
    db: Session,
    q: str | None = None,
    category_id: uuid.UUID | None = None,
    status: AssetStatus | None = None,
    department_id: uuid.UUID | None = None,
    location: str | None = None,
    is_bookable: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Asset]:
    stmt = select(Asset)

    if department_id:
        stmt = stmt.join(
            Allocation,
            (Allocation.asset_id == Asset.id) & (Allocation.status == AllocationStatus.ACTIVE),
        ).where(Allocation.holder_department_id == department_id)

    if q:
        stmt = stmt.where(
            or_(
                Asset.name.ilike(f"%{q}%"),
                Asset.asset_tag.ilike(f"%{q}%"),
                Asset.serial_number.ilike(f"%{q}%"),
            )
        )
    if category_id:
        stmt = stmt.where(Asset.category_id == category_id)
    if status:
        stmt = stmt.where(Asset.status == status)
    if location:
        stmt = stmt.where(Asset.location.ilike(f"%{location}%"))
    if is_bookable is not None:
        stmt = stmt.where(Asset.is_bookable == is_bookable)

    stmt = stmt.order_by(Asset.created_at.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()


def get_detail(db: Session, asset_id: uuid.UUID) -> Asset:
    stmt = (
        select(Asset)
        .options(
            joinedload(Asset.allocations).joinedload(Allocation.holder),
            joinedload(Asset.allocations).joinedload(Allocation.holder_department),
            joinedload(Asset.maintenance_requests),
        )
        .where(Asset.id == asset_id)
    )
    db_asset = db.scalars(stmt).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset


def update(db: Session, asset_id: uuid.UUID, data: AssetUpdate, actor_id: uuid.UUID) -> Asset:
    db_asset = get_detail(db, asset_id)

    update_data = data.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] != db_asset.status:
        # Enforce transitions
        allowed = False
        old_status = db_asset.status
        new_status = update_data["status"]

        if (old_status == AssetStatus.AVAILABLE and new_status == AssetStatus.RETIRED) or (
            old_status == AssetStatus.RETIRED and new_status == AssetStatus.DISPOSED
        ):
            allowed = True

        if not allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status transition from {old_status.value} to {new_status.value}",
            )

        activity_service.log(
            db=db,
            actor_id=actor_id,
            action="asset.status_changed",
            entity_type="asset",
            entity_id=db_asset.id,
            metadata={"from": old_status.value, "to": new_status.value},
        )

    for key, value in update_data.items():
        setattr(db_asset, key, value)

    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset
