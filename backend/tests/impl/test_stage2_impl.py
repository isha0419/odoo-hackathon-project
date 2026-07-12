import uuid

import pytest
from sqlalchemy.orm import Session

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.enums import AllocationStatus, AssetStatus
from app.models.user import User
from app.schemas.allocation import AllocateRequest
from app.services import allocation_service


def test_allocation_service_raises_asset_already_allocated_error(db_session: Session):
    """
    Test that the allocation service raises AssetAlreadyAllocatedError (Service-layer pre-check)
    when attempting to allocate an already active asset.
    """
    # 1. Create User
    actor_id = uuid.uuid4()
    user = User(id=actor_id, name="Actor", email="actor@assetflow.io", password_hash="hash")
    db_session.add(user)

    holder_id = uuid.uuid4()
    holder = User(id=holder_id, name="Holder", email="holder@assetflow.io", password_hash="hash")
    db_session.add(holder)

    # 2. Create Category and Asset
    cat_id = uuid.uuid4()
    category = AssetCategory(id=cat_id, name="Laptops")
    db_session.add(category)

    asset_id = uuid.uuid4()
    asset = Asset(id=asset_id, name="Laptop 1", category_id=cat_id, asset_tag="AF-9999", status=AssetStatus.AVAILABLE)
    db_session.add(asset)
    db_session.commit()

    # 3. First allocation
    req1 = AllocateRequest(asset_id=asset_id, holder_user_id=holder_id)
    alloc1 = allocation_service.allocate(db_session, req1, actor_id=actor_id)

    assert alloc1.status == AllocationStatus.ACTIVE
    assert asset.status == AssetStatus.ALLOCATED

    # 4. Attempt second allocation (Service Pre-check)
    req2 = AllocateRequest(asset_id=asset_id, holder_user_id=actor_id)
    with pytest.raises(allocation_service.AssetAlreadyAllocatedError) as exc_info:
        allocation_service.allocate(db_session, req2, actor_id=actor_id)

    conflict_body = exc_info.value.conflict_body
    assert conflict_body["error"] == "asset_already_allocated"
    assert conflict_body["current_holder"]["name"] == "Holder"


def test_allocation_postgres_constraint_violation(db_session: Session):
    """
    Test the Crown Jewel #1 Postgres constraint `one_active_allocation_per_asset`
    by bypassing the service layer and attempting to insert directly.
    """
    from sqlalchemy.exc import IntegrityError

    asset_id = uuid.uuid4()
    cat_id = uuid.uuid4()
    category = AssetCategory(id=cat_id, name="Monitors")
    db_session.add(category)
    asset = Asset(id=asset_id, name="Monitor 1", category_id=cat_id, asset_tag="AF-9998", status=AssetStatus.ALLOCATED)
    db_session.add(asset)
    db_session.commit()

    admin_id = uuid.uuid4()
    admin = User(id=admin_id, name="Admin", email="admin2@assetflow.io", password_hash="hash")
    db_session.add(admin)
    db_session.commit()

    alloc1 = Allocation(asset_id=asset_id, allocated_by=admin_id, status=AllocationStatus.ACTIVE)
    db_session.add(alloc1)
    db_session.commit()

    alloc2 = Allocation(asset_id=asset_id, allocated_by=admin_id, status=AllocationStatus.ACTIVE)
    db_session.add(alloc2)

    with pytest.raises(IntegrityError) as exc_info:
        db_session.commit()

    # Verify the exact constraint name was hit
    assert "one_active_allocation_per_asset" in str(exc_info.value)
    db_session.rollback()
