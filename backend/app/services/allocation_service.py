"""AssetFlow — Allocation Service (Track B, CJ#1)."""

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.enums import AllocationStatus, AssetStatus, NotificationType
from app.schemas.allocation import AllocateRequest
from app.services import activity_service, notifications_service


class AssetAlreadyAllocatedError(Exception):
    def __init__(self, conflict_body: dict):
        self.conflict_body = conflict_body


def allocate(db: Session, data: AllocateRequest, actor_id: uuid.UUID) -> Allocation:
    asset = db.scalar(select(Asset).where(Asset.id == data.asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    from app.deps import check_department_scope
    from app.models.user import User

    actor = db.get(User, actor_id)
    if actor:
        check_department_scope(actor, asset.department_id)

    if asset.status not in (AssetStatus.AVAILABLE, AssetStatus.ALLOCATED):
        raise HTTPException(
            status_code=422,
            detail=f"Asset cannot be allocated. Current status: {asset.status.value}",
        )

    # 2. Pre-check: Query for ACTIVE allocation
    active_alloc = db.scalar(
        select(Allocation)
        .options(joinedload(Allocation.holder), joinedload(Allocation.holder_department))
        .where(Allocation.asset_id == data.asset_id, Allocation.returned_at.is_(None))
    )

    if active_alloc:
        holder_name = active_alloc.holder.name if active_alloc.holder else "Unknown"
        dept_name = active_alloc.holder_department.name if active_alloc.holder_department else "Unknown"

        conflict_body = {
            "error": "asset_already_allocated",
            "message": f"Currently held by {holder_name} ({dept_name}).",
            "current_holder": {
                "user_id": str(active_alloc.holder_user_id) if active_alloc.holder_user_id else None,
                "name": holder_name,
                "department": dept_name,
            },
            "suggested_action": "transfer_request",
        }
        raise AssetAlreadyAllocatedError(conflict_body=conflict_body)

    # 4. Insert allocation
    new_alloc = Allocation(
        asset_id=data.asset_id,
        holder_user_id=data.holder_user_id,
        holder_department_id=data.holder_department_id,
        allocated_by=actor_id,
        expected_return_date=data.expected_return_date,
        status=AllocationStatus.ACTIVE,
    )
    db.add(new_alloc)

    # Set asset status
    asset.status = AssetStatus.ALLOCATED
    db.add(asset)
    db.flush()

    # Log and Notify
    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="asset.allocated",
        entity_type="asset",
        entity_id=asset.id,
        metadata={"allocation_id": str(new_alloc.id)},
    )

    if data.holder_user_id:
        notifications_service.create(
            db=db,
            recipient_id=data.holder_user_id,
            type=NotificationType.ASSET_ASSIGNED,
            message=f"You have been allocated asset {asset.asset_tag} ({asset.name}).",
            entity_type="allocation",
            entity_id=new_alloc.id,
        )

    db.commit()
    db.refresh(new_alloc)
    return new_alloc


def return_asset(db: Session, allocation_id: uuid.UUID, notes: str | None, actor_id: uuid.UUID) -> Allocation:
    alloc = db.scalar(select(Allocation).options(joinedload(Allocation.asset)).where(Allocation.id == allocation_id))
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")

    from app.deps import check_department_scope
    from app.models.user import User

    actor = db.get(User, actor_id)
    if actor and alloc.asset:
        check_department_scope(actor, alloc.asset.department_id)

    if alloc.status != AllocationStatus.ACTIVE:
        raise HTTPException(status_code=422, detail="Allocation is already closed")

    from sqlalchemy import func

    # Close allocation
    alloc.returned_at = func.now()
    alloc.status = AllocationStatus.RETURNED
    alloc.return_condition_notes = notes
    db.add(alloc)

    # Update asset
    asset = db.scalar(select(Asset).where(Asset.id == alloc.asset_id))
    if asset:
        asset.status = AssetStatus.AVAILABLE
        db.add(asset)

        activity_service.log(
            db=db,
            actor_id=actor_id,
            action="asset.returned",
            entity_type="asset",
            entity_id=asset.id,
            metadata={"allocation_id": str(alloc.id)},
        )

    db.commit()
    db.refresh(alloc)
    return alloc


def list_allocations(
    db: Session,
    overdue: bool = False,
    holder_user_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Allocation]:
    stmt = select(Allocation).options(
        joinedload(Allocation.asset),
        joinedload(Allocation.holder),
        joinedload(Allocation.holder_department),
    )

    if holder_user_id:
        stmt = stmt.where(Allocation.holder_user_id == holder_user_id)

    if overdue:
        from datetime import date

        stmt = stmt.where(Allocation.status == AllocationStatus.ACTIVE, Allocation.expected_return_date < date.today())

    stmt = stmt.order_by(Allocation.allocated_at.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()
