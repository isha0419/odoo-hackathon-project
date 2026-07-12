"""AssetFlow — Maintenance Service (Track C)."""

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import AssetStatus, MaintenancePriority, MaintenanceStatus, NotificationType
from app.models.maintenance_request import MaintenanceRequest
from app.schemas.maintenance import MaintenanceCreate, MaintenanceTransition
from app.services import activity_service, notifications_service


def raise_request(db: Session, data: MaintenanceCreate, actor_id: uuid.UUID) -> MaintenanceRequest:
    req = MaintenanceRequest(
        asset_id=data.asset_id,
        raised_by=actor_id,
        issue_description=data.issue_description,
        priority=data.priority,
        photo_url=data.photo_url,
        status=MaintenanceStatus.PENDING,
    )
    db.add(req)
    db.flush()

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="maintenance.raised",
        entity_type="maintenance",
        entity_id=req.id,
    )

    db.commit()
    db.refresh(req)
    return get_detail(db, req.id)


def get_detail(db: Session, request_id: uuid.UUID) -> MaintenanceRequest:
    req = db.scalar(
        select(MaintenanceRequest)
        .options(joinedload(MaintenanceRequest.asset), joinedload(MaintenanceRequest.raiser))
        .where(MaintenanceRequest.id == request_id)
    )
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return req


def transition(
    db: Session, request_id: uuid.UUID, data: MaintenanceTransition, actor_id: uuid.UUID
) -> MaintenanceRequest:
    req = get_detail(db, request_id)
    old_status = req.status
    new_status = data.to_status

    # Validate transitions
    valid = False
    if old_status == MaintenanceStatus.PENDING and new_status in (
        MaintenanceStatus.APPROVED,
        MaintenanceStatus.REJECTED,
    ):
        valid = True
    elif old_status == MaintenanceStatus.APPROVED and new_status == MaintenanceStatus.TECHNICIAN_ASSIGNED:
        if not data.technician_name:
            raise HTTPException(status_code=422, detail="Technician name is required for assignment")
        valid = True
    elif (old_status == MaintenanceStatus.TECHNICIAN_ASSIGNED and new_status == MaintenanceStatus.IN_PROGRESS) or (
        old_status == MaintenanceStatus.IN_PROGRESS and new_status == MaintenanceStatus.RESOLVED
    ):
        valid = True

    if not valid:
        raise HTTPException(status_code=422, detail=f"Invalid transition from {old_status.value} to {new_status.value}")

    # Apply transition
    req.status = new_status
    if data.technician_name:
        req.technician_name = data.technician_name

    asset = req.asset

    # Side-effects
    if new_status == MaintenanceStatus.APPROVED:
        req.approved_by = actor_id
        asset.status = AssetStatus.UNDER_MAINTENANCE
        db.add(asset)

        notifications_service.create(
            db=db,
            recipient_id=req.raised_by,
            type=NotificationType.MAINTENANCE_APPROVED,
            message=f"Maintenance for {asset.name} was approved.",
            entity_type="maintenance",
            entity_id=req.id,
        )
    elif new_status == MaintenanceStatus.REJECTED:
        req.approved_by = actor_id

        notifications_service.create(
            db=db,
            recipient_id=req.raised_by,
            type=NotificationType.MAINTENANCE_REJECTED,
            message=f"Maintenance for {asset.name} was rejected.",
            entity_type="maintenance",
            entity_id=req.id,
        )
    elif new_status == MaintenanceStatus.RESOLVED:
        req.resolved_at = func.now()
        asset.status = AssetStatus.AVAILABLE
        db.add(asset)

        activity_service.log(
            db=db,
            actor_id=actor_id,
            action="maintenance.resolved",
            entity_type="asset",
            entity_id=asset.id,
            metadata={"maintenance_id": str(req.id)},
        )

    db.add(req)

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="maintenance.transitioned",
        entity_type="maintenance",
        entity_id=req.id,
        metadata={"from": old_status.value, "to": new_status.value},
    )

    db.commit()
    db.refresh(req)
    return req


def list_requests(
    db: Session,
    asset_id: uuid.UUID | None = None,
    status: MaintenanceStatus | None = None,
    priority: MaintenancePriority | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MaintenanceRequest]:
    stmt = select(MaintenanceRequest).options(
        joinedload(MaintenanceRequest.asset), joinedload(MaintenanceRequest.raiser)
    )

    if asset_id:
        stmt = stmt.where(MaintenanceRequest.asset_id == asset_id)
    if status:
        stmt = stmt.where(MaintenanceRequest.status == status)
    if priority:
        stmt = stmt.where(MaintenanceRequest.priority == priority)

    stmt = stmt.order_by(MaintenanceRequest.created_at.desc()).limit(limit).offset(offset)
    return db.scalars(stmt).all()
