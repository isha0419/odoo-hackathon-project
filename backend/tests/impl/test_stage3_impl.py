import pytest
from sqlalchemy.orm import Session
from app.services import booking_service
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.user import User
from app.models.booking import Booking
from app.schemas.booking import BookingCreate
from app.models.enums import AssetStatus, BookingStatus
import uuid
from datetime import datetime, timedelta, timezone

def test_booking_service_raises_booking_overlap_error(db_session: Session):
    """
    Test that the booking service raises BookingOverlapError (Service-layer pre-check)
    when attempting to book an overlapping time slot.
    """
    # 1. Create User
    actor_id = uuid.uuid4()
    user = User(id=actor_id, name="Booker", email="booker@assetflow.io", password_hash="hash")
    db_session.add(user)
    
    # 2. Create Category and Bookable Asset
    cat_id = uuid.uuid4()
    category = AssetCategory(id=cat_id, name="Spaces")
    db_session.add(category)
    
    asset_id = uuid.uuid4()
    asset = Asset(id=asset_id, name="Room 1", category_id=cat_id, asset_tag="AF-8888", is_bookable=True)
    db_session.add(asset)
    db_session.commit()
    
    # 3. Create first booking (09:00 - 10:00 tomorrow)
    now = datetime.now(timezone.utc)
    start_time = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=1)
    
    req1 = BookingCreate(asset_id=asset_id, start=start_time, end=end_time)
    booking1 = booking_service.create(db_session, req1, actor_id=actor_id)
    
    assert booking1.status == BookingStatus.UPCOMING
    
    # 4. Attempt overlapping booking (09:30 - 10:30)
    overlap_start = start_time + timedelta(minutes=30)
    overlap_end = end_time + timedelta(minutes=30)
    
    req2 = BookingCreate(asset_id=asset_id, start=overlap_start, end=overlap_end)
    
    with pytest.raises(booking_service.BookingOverlapError) as exc_info:
        booking_service.create(db_session, req2, actor_id=actor_id)
    
    conflict_body = exc_info.value.conflict_body
    assert conflict_body["error"] == "booking_overlap"
    assert "conflicting_booking" in conflict_body

def test_booking_postgres_gist_constraint(db_session: Session):
    """
    Test the Crown Jewel #2 Postgres constraint `no_overlapping_bookings`
    by bypassing the service layer and inserting overlapping ranges.
    """
    from sqlalchemy.exc import IntegrityError
    from psycopg2.extras import DateTimeTZRange
    
    asset_id = uuid.uuid4()
    cat_id = uuid.uuid4()
    category = AssetCategory(id=cat_id, name="Cars")
    db_session.add(category)
    asset = Asset(id=asset_id, name="Car 1", category_id=cat_id, asset_tag="AF-8887", is_bookable=True)
    db_session.add(asset)
    
    actor_id = uuid.uuid4()
    user = User(id=actor_id, name="Driver", email="driver@assetflow.io", password_hash="hash")
    db_session.add(user)
    db_session.commit()
    
    now = datetime.now(timezone.utc)
    start_time = now.replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=2)
    
    # First booking
    b1 = Booking(
        asset_id=asset_id,
        booked_by_user_id=actor_id,
        time_range=DateTimeTZRange(start_time, end_time, "[)"),
        status=BookingStatus.UPCOMING
    )
    db_session.add(b1)
    db_session.commit()
    
    # Overlapping booking
    overlap_start = start_time + timedelta(hours=1)
    overlap_end = end_time + timedelta(hours=1)
    
    b2 = Booking(
        asset_id=asset_id,
        booked_by_user_id=actor_id,
        time_range=DateTimeTZRange(overlap_start, overlap_end, "[)"),
        status=BookingStatus.UPCOMING
    )
    db_session.add(b2)
    
    with pytest.raises(IntegrityError) as exc_info:
        db_session.commit()
    
    # Verify exclusion constraint
    assert "prevent_overlapping_bookings" in str(exc_info.value)
    db_session.rollback()
