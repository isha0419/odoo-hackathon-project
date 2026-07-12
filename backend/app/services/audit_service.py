"""AssetFlow — Audit Service (Track D)."""

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.asset import Asset
from app.models.audit_cycle import AuditCycle
from app.models.audit_cycle_auditor import AuditCycleAuditor
from app.models.audit_item import AuditItem
from app.models.enums import AssetStatus, AuditCycleStatus, AuditVerification, NotificationType
from app.schemas.audit import AssignAuditorsRequest, AuditCycleCreate, AuditItemUpdate
from app.services import activity_service, notifications_service


def _enrich_cycle(db: Session, cycle: AuditCycle) -> AuditCycle:
    # Compute counts
    counts = db.execute(
        select(AuditItem.verification, func.count(AuditItem.id))
        .where(AuditItem.audit_cycle_id == cycle.id)
        .group_by(AuditItem.verification)
    ).all()

    count_map = {row[0]: row[1] for row in counts}
    cycle.pending_count = count_map.get(AuditVerification.PENDING, 0)
    cycle.verified_count = count_map.get(AuditVerification.VERIFIED, 0)
    cycle.missing_count = count_map.get(AuditVerification.MISSING, 0)
    cycle.damaged_count = count_map.get(AuditVerification.DAMAGED, 0)
    return cycle


def create_cycle(db: Session, data: AuditCycleCreate, actor_id: uuid.UUID) -> AuditCycle:
    cycle = AuditCycle(
        name=data.name,
        scope_department_id=data.scope_department_id,
        scope_location=data.scope_location,
        start_date=data.start_date,
        end_date=data.end_date,
        status=AuditCycleStatus.OPEN,
        created_by=actor_id,
    )
    db.add(cycle)
    db.flush()

    # Snapshot assets
    stmt = select(Asset).where(Asset.status != AssetStatus.DISPOSED)
    if data.scope_location:
        stmt = stmt.where(Asset.location.ilike(f"%{data.scope_location}%"))
    # If scope_department_id, it gets complex as assets don't have department directly,
    # it depends on allocations. We'll simplify or just skip dept filtering if it's too complex.
    # The spec mentions "Scope by department and/or location if provided."
    if data.scope_department_id:
        from app.models.allocation import Allocation
        from app.models.enums import AllocationStatus

        stmt = stmt.join(
            Allocation, (Allocation.asset_id == Asset.id) & (Allocation.status == AllocationStatus.ACTIVE)
        ).where(Allocation.holder_department_id == data.scope_department_id)

    assets_in_scope = db.scalars(stmt).all()

    audit_items = []
    for asset in assets_in_scope:
        item = AuditItem(
            audit_cycle_id=cycle.id,
            asset_id=asset.id,
            expected_location=asset.location,
            verification=AuditVerification.PENDING,
        )
        audit_items.append(item)

    db.add_all(audit_items)
    db.commit()
    db.refresh(cycle)
    return _enrich_cycle(db, cycle)


def assign_auditors(db: Session, cycle_id: uuid.UUID, data: AssignAuditorsRequest, actor_id: uuid.UUID) -> AuditCycle:
    cycle = db.scalar(select(AuditCycle).where(AuditCycle.id == cycle_id))
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")

    for user_id in data.user_ids:
        # Avoid duplicate assignment
        exists = db.scalar(
            select(AuditCycleAuditor).where(
                AuditCycleAuditor.audit_cycle_id == cycle_id, AuditCycleAuditor.user_id == user_id
            )
        )
        if not exists:
            db.add(AuditCycleAuditor(audit_cycle_id=cycle_id, user_id=user_id))

    db.commit()

    # Reload with auditors
    cycle = db.scalar(
        select(AuditCycle)
        .options(joinedload(AuditCycle.auditors).joinedload(AuditCycleAuditor.user))
        .where(AuditCycle.id == cycle_id)
    )
    return _enrich_cycle(db, cycle)


def mark_item(db: Session, item_id: uuid.UUID, data: AuditItemUpdate, actor_id: uuid.UUID) -> AuditItem:
    item = db.scalar(select(AuditItem).options(joinedload(AuditItem.asset)).where(AuditItem.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Audit item not found")

    # Check if actor is an assigned auditor
    is_auditor = db.scalar(
        select(AuditCycleAuditor).where(
            AuditCycleAuditor.audit_cycle_id == item.audit_cycle_id, AuditCycleAuditor.user_id == actor_id
        )
    )
    if not is_auditor:
        # Admins should probably bypass this, but spec says "Only assigned auditors can mark items"
        raise HTTPException(status_code=403, detail="You are not assigned as an auditor for this cycle")

    item.verification = data.verification
    item.notes = data.notes
    item.verified_by = actor_id
    item.verified_at = func.now()

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def close_cycle(db: Session, cycle_id: uuid.UUID, actor_id: uuid.UUID) -> AuditCycle:
    cycle = db.scalar(select(AuditCycle).where(AuditCycle.id == cycle_id))
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")

    if cycle.status == AuditCycleStatus.CLOSED:
        raise HTTPException(status_code=422, detail="Audit cycle is already closed")

    cycle.status = AuditCycleStatus.CLOSED
    db.add(cycle)

    # Process missing items
    missing_items = db.scalars(
        select(AuditItem)
        .options(joinedload(AuditItem.asset))
        .where(AuditItem.audit_cycle_id == cycle_id, AuditItem.verification == AuditVerification.MISSING)
    ).all()

    for item in missing_items:
        asset = item.asset
        asset.status = AssetStatus.LOST
        db.add(asset)

        activity_service.log(
            db=db,
            actor_id=actor_id,
            action="asset.lost",
            entity_type="asset",
            entity_id=asset.id,
            metadata={"audit_cycle_id": str(cycle_id)},
        )

        # Notify someone? Spec says: Create AUDIT_DISCREPANCY notifications for each flagged item
        # Since it's a discrepancy, maybe notify admins or asset managers?
        # In a real system we'd notify the responsible manager. For now, actor_id or specific role.
        notifications_service.create(
            db=db,
            recipient_id=actor_id,  # Or None if it's a system wide alert? Let's notify the closer
            type=NotificationType.AUDIT_DISCREPANCY,
            message=f"Discrepancy: Asset {asset.name} marked as MISSING in audit {cycle.name}.",
            entity_type="audit_cycle",
            entity_id=cycle.id,
        )

    # Also notify for DAMAGED
    damaged_items = db.scalars(
        select(AuditItem)
        .options(joinedload(AuditItem.asset))
        .where(AuditItem.audit_cycle_id == cycle_id, AuditItem.verification == AuditVerification.DAMAGED)
    ).all()

    for item in damaged_items:
        notifications_service.create(
            db=db,
            recipient_id=actor_id,
            type=NotificationType.AUDIT_DISCREPANCY,
            message=f"Discrepancy: Asset {item.asset.name} marked as DAMAGED in audit {cycle.name}.",
            entity_type="audit_cycle",
            entity_id=cycle.id,
        )

    activity_service.log(
        db=db,
        actor_id=actor_id,
        action="audit.cycle_closed",
        entity_type="audit_cycle",
        entity_id=cycle.id,
    )

    db.commit()
    db.refresh(cycle)
    return _enrich_cycle(db, cycle)


def get_discrepancies(db: Session, cycle_id: uuid.UUID) -> dict:
    cycle = db.scalar(select(AuditCycle).where(AuditCycle.id == cycle_id))
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")

    items = db.scalars(
        select(AuditItem)
        .options(joinedload(AuditItem.asset))
        .where(
            AuditItem.audit_cycle_id == cycle_id,
            AuditItem.verification.in_([AuditVerification.MISSING, AuditVerification.DAMAGED]),
        )
    ).all()

    return {"cycle_id": cycle.id, "cycle_name": cycle.name, "discrepancies": items}


def list_cycles(db: Session, limit: int = 50, offset: int = 0) -> list[AuditCycle]:
    stmt = (
        select(AuditCycle)
        .options(joinedload(AuditCycle.auditors).joinedload(AuditCycleAuditor.user))
        .order_by(AuditCycle.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    cycles = db.scalars(stmt).unique().all()
    return [_enrich_cycle(db, c) for c in cycles]


def get_cycle(db: Session, cycle_id: uuid.UUID) -> AuditCycle:
    cycle = db.scalar(
        select(AuditCycle)
        .options(joinedload(AuditCycle.auditors).joinedload(AuditCycleAuditor.user))
        .where(AuditCycle.id == cycle_id)
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
    return _enrich_cycle(db, cycle)
