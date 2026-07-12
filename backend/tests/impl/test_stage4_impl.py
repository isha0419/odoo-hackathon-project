import datetime
import uuid

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.audit_cycle import AuditCycle
from app.models.audit_item import AuditItem
from app.models.enums import AssetStatus, AuditCycleStatus, AuditVerification, NotificationType
from app.models.notification import Notification
from app.models.user import User
from app.services import audit_service


def test_audit_close_cycle_marks_missing_assets_lost_and_notifies(db_session: Session):
    """
    Test that closing an audit cycle updates assets with MISSING status to LOST
    and creates AUDIT_DISCREPANCY notifications.
    """
    actor_id = uuid.uuid4()
    user = User(id=actor_id, name="Actor", email="actor@assetflow.io", password_hash="hash")
    db_session.add(user)

    # 1. Create Category and Asset
    cat_id = uuid.uuid4()
    category = AssetCategory(id=cat_id, name="Furniture")
    db_session.add(category)

    asset1_id = uuid.uuid4()
    asset1 = Asset(id=asset1_id, name="Desk 1", category_id=cat_id, asset_tag="AF-7777", status=AssetStatus.AVAILABLE)
    db_session.add(asset1)

    asset2_id = uuid.uuid4()
    asset2 = Asset(id=asset2_id, name="Desk 2", category_id=cat_id, asset_tag="AF-7778", status=AssetStatus.AVAILABLE)
    db_session.add(asset2)
    db_session.commit()

    # 2. Create Audit Cycle manually in DB
    cycle_id = uuid.uuid4()
    cycle = AuditCycle(
        id=cycle_id,
        name="Test Audit",
        start_date=datetime.date(2026, 1, 1),
        end_date=datetime.date(2026, 1, 15),
        status=AuditCycleStatus.OPEN,
        created_by=actor_id,
    )
    db_session.add(cycle)
    db_session.commit()

    # 3. Create Audit Items
    item1 = AuditItem(audit_cycle_id=cycle_id, asset_id=asset1_id, verification=AuditVerification.MISSING)
    item2 = AuditItem(audit_cycle_id=cycle_id, asset_id=asset2_id, verification=AuditVerification.VERIFIED)
    db_session.add(item1)
    db_session.add(item2)
    db_session.commit()

    # 4. Close the cycle via service
    enriched_cycle = audit_service.close_cycle(db_session, cycle_id, actor_id=actor_id)

    assert enriched_cycle.status == AuditCycleStatus.CLOSED
    assert enriched_cycle.missing_count == 1
    assert enriched_cycle.verified_count == 1

    # Verify Asset 1 is LOST, Asset 2 is still AVAILABLE
    db_session.refresh(asset1)
    db_session.refresh(asset2)
    assert asset1.status == AssetStatus.LOST
    assert asset2.status == AssetStatus.AVAILABLE

    # Verify Notification was generated
    notifications = (
        db_session.query(Notification).filter_by(type=NotificationType.AUDIT_DISCREPANCY, entity_id=cycle_id).all()
    )

    assert len(notifications) == 1
    assert "MISSING" in notifications[0].message
    assert "Desk 1" in notifications[0].message
