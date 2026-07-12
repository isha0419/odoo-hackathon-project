"""AssetFlow — Transfer Service (Track B)."""

import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.enums import AllocationStatus, AssetStatus, NotificationType, TransferStatus
from app.models.transfer_request import TransferRequest
from app.models.user import User
from app.schemas.transfer import TransferCreate
from app.services import activity_service, notifications_service


def create(db: Session, data: TransferCreate, actor_id: uuid.UUID) -> TransferRequest:
    # Validate asset is allocated
    active_alloc = db.scalar(
        select(Allocation).where(
            Allocation.asset_id == data.asset_id,
            Allocation.status == AllocationStatus.ACTIVE
        )
    )
    if not active_alloc or not active_alloc.holder_user_id:
        raise HTTPException(
            status_code=422,
            detail="Asset must be currently allocated to a user to request a transfer"
        )
    
    # Optional: check if actor_id is the holder? The spec says "allocated to from_user (the actor or specified user)".
    # We'll just take the holder as from_user_id
    from_user_id = active_alloc.holder_user_id

    transfer = TransferRequest(
        asset_id=data.asset_id,
        from_user_id=from_user_id,
        to_user_id=data.to_user_id,
        requested_by=actor_id,
        reason=data.reason,
        status=TransferStatus.REQUESTED,
    )
    db.add(transfer)
    db.flush()

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="transfer.requested",
        entity_type="transfer",
        entity_id=transfer.id,
    )
    db.commit()
    db.refresh(transfer)
    return get_detail(db, transfer.id)


def get_detail(db: Session, transfer_id: uuid.UUID) -> TransferRequest:
    stmt = select(TransferRequest).options(
        joinedload(TransferRequest.asset),
        joinedload(TransferRequest.from_user),
        joinedload(TransferRequest.to_user),
    ).where(TransferRequest.id == transfer_id)
    req = db.scalar(stmt)
    if not req:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return req


def approve(db: Session, transfer_id: uuid.UUID, actor_id: uuid.UUID) -> TransferRequest:
    transfer = get_detail(db, transfer_id)
    if transfer.status != TransferStatus.REQUESTED:
        raise HTTPException(status_code=422, detail="Transfer is not in REQUESTED state")

    # Find old allocation
    old_alloc = db.scalar(
        select(Allocation).where(
            Allocation.asset_id == transfer.asset_id,
            Allocation.status == AllocationStatus.ACTIVE
        )
    )
    if not old_alloc:
        raise HTTPException(status_code=422, detail="Active allocation not found for this asset")

    # Determine to_user's department
    to_user = db.scalar(select(User).where(User.id == transfer.to_user_id))

    # Close old
    old_alloc.returned_at = func.now()
    old_alloc.status = AllocationStatus.RETURNED
    old_alloc.return_condition_notes = "Transfer approved"
    db.add(old_alloc)

    # Open new
    new_alloc = Allocation(
        asset_id=transfer.asset_id,
        holder_user_id=transfer.to_user_id,
        holder_department_id=to_user.department_id if to_user else None,
        allocated_by=actor_id,
        status=AllocationStatus.ACTIVE,
    )
    db.add(new_alloc)

    # Resolve transfer
    transfer.status = TransferStatus.COMPLETED
    transfer.approved_by = actor_id
    transfer.resolved_at = func.now()
    db.add(transfer)

    # Asset stays ALLOCATED
    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="asset.transferred",
        entity_type="asset",
        entity_id=transfer.asset_id,
        metadata={"transfer_id": str(transfer.id)}
    )

    notifications_service.create(
        db=db,
        recipient_id=transfer.from_user_id,
        type=NotificationType.TRANSFER_APPROVED,
        message=f"Transfer of asset {transfer.asset.name} has been approved.",
        entity_type="transfer",
        entity_id=transfer.id,
    )
    notifications_service.create(
        db=db,
        recipient_id=transfer.to_user_id,
        type=NotificationType.TRANSFER_APPROVED,
        message=f"Asset {transfer.asset.name} has been transferred to you.",
        entity_type="transfer",
        entity_id=transfer.id,
    )

    db.commit()
    db.refresh(transfer)
    return get_detail(db, transfer.id)


def reject(db: Session, transfer_id: uuid.UUID, actor_id: uuid.UUID) -> TransferRequest:
    transfer = get_detail(db, transfer_id)
    if transfer.status != TransferStatus.REQUESTED:
        raise HTTPException(status_code=422, detail="Transfer is not in REQUESTED state")

    transfer.status = TransferStatus.REJECTED
    transfer.approved_by = actor_id
    transfer.resolved_at = func.now()
    db.add(transfer)

    notifications_service.create(
        db=db,
        recipient_id=transfer.requested_by,
        type=NotificationType.TRANSFER_REJECTED,
        message=f"Transfer request for {transfer.asset.name} was rejected.",
        entity_type="transfer",
        entity_id=transfer.id,
    )

    db.commit()
    db.refresh(transfer)
    return get_detail(db, transfer.id)


def list_transfers(
    db: Session,
    status: Optional[TransferStatus] = None,
    department_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    offset: int = 0
) -> List[TransferRequest]:
    stmt = select(TransferRequest).options(
        joinedload(TransferRequest.asset),
        joinedload(TransferRequest.from_user),
        joinedload(TransferRequest.to_user),
    )
    
    if status:
        stmt = stmt.where(TransferRequest.status == status)

    if department_id:
        # Filter by department of from_user or to_user? Usually Dept Head sees transfers involving their dept
        stmt = stmt.join(User, TransferRequest.from_user_id == User.id).where(
            User.department_id == department_id
        )

    stmt = stmt.order_by(TransferRequest.created_at.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()
