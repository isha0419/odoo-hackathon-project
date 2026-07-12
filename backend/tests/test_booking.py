from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.department import Department
from app.models.enums import AssetStatus, UserRole
from app.models.user import User
from app.security import create_access_token


@pytest.fixture
def test_dept(db_session: Session) -> Department:
    dept = Department(name="Test Dept")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    return dept


@pytest.fixture
def admin_user(db_session: Session, test_dept: Department) -> User:
    user = User(
        name="Admin Test",
        email="admin.test@example.com",
        role=UserRole.ADMIN,
        hashed_password="hashed",
        department_id=test_dept.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(data={"sub": str(admin_user.id)})


@pytest.fixture
def bookable_category(db_session: Session) -> AssetCategory:
    cat = AssetCategory(name="Bookable Cat")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


@pytest.fixture
def non_bookable_category(db_session: Session) -> AssetCategory:
    cat = AssetCategory(name="Non-Bookable Cat", custom_fields={"is_bookable": False})
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


@pytest.fixture
def bookable_asset(db_session: Session, bookable_category: AssetCategory, test_dept: Department) -> Asset:
    asset = Asset(
        name="Projector 1",
        category_id=bookable_category.id,
        department_id=test_dept.id,
        is_bookable=True,
        status=AssetStatus.AVAILABLE,
    )
    db_session.add(asset)
    db_session.commit()
    db_session.refresh(asset)
    return asset


@pytest.fixture
def non_bookable_asset(db_session: Session, non_bookable_category: AssetCategory, test_dept: Department) -> Asset:
    asset = Asset(
        name="Laptop 1",
        category_id=non_bookable_category.id,
        department_id=test_dept.id,
        is_bookable=False,
        status=AssetStatus.AVAILABLE,
    )
    db_session.add(asset)
    db_session.commit()
    db_session.refresh(asset)
    return asset


class TestBookingService:
    def test_book_bookable_asset_success(self, client, admin_token, bookable_asset):
        now = datetime.utcnow()
        start = (now + timedelta(hours=1)).isoformat()
        end = (now + timedelta(hours=2)).isoformat()

        response = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": start,
                "end_time": end,
                "purpose": "Presentation",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["asset_id"] == str(bookable_asset.id)
        assert data["temporal_status"] == "UPCOMING"
        assert data["status"] == "ACTIVE"

    def test_book_overlap_fails(self, client, admin_token, bookable_asset):
        now = datetime.utcnow()
        start = (now + timedelta(hours=1)).isoformat()
        end = (now + timedelta(hours=3)).isoformat()

        # First booking
        client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": start,
                "end_time": end,
                "purpose": "Meeting 1",
            },
        )

        # Overlapping booking
        overlap_start = (now + timedelta(hours=2)).isoformat()
        overlap_end = (now + timedelta(hours=4)).isoformat()
        response = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": overlap_start,
                "end_time": overlap_end,
                "purpose": "Meeting 2",
            },
        )
        assert response.status_code == 409
        data = response.json()
        assert "overlap_type" in data
        assert data["overlap_type"] == "BOOKING_OVERLAP"

    def test_book_touching_endpoints_success(self, client, admin_token, bookable_asset):
        now = datetime.utcnow()
        t1 = (now + timedelta(hours=1)).isoformat()
        t2 = (now + timedelta(hours=2)).isoformat()
        t3 = (now + timedelta(hours=3)).isoformat()

        # First booking
        res1 = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": t1,
                "end_time": t2,
                "purpose": "Meeting 1",
            },
        )
        assert res1.status_code == 200

        # Touching booking
        res2 = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": t2,
                "end_time": t3,
                "purpose": "Meeting 2",
            },
        )
        assert res2.status_code == 200

    def test_book_non_bookable_fails(self, client, admin_token, non_bookable_asset):
        now = datetime.utcnow()
        start = (now + timedelta(hours=1)).isoformat()
        end = (now + timedelta(hours=2)).isoformat()

        response = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(non_bookable_asset.id),
                "start_time": start,
                "end_time": end,
                "purpose": "Meeting",
            },
        )
        assert response.status_code == 422
        data = response.json()
        assert "not bookable" in data["detail"].lower()

    def test_cancel_booking(self, client, admin_token, bookable_asset):
        now = datetime.utcnow()
        start = (now + timedelta(hours=1)).isoformat()
        end = (now + timedelta(hours=2)).isoformat()

        # Create
        create_res = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": start,
                "end_time": end,
                "purpose": "Meeting",
            },
        )
        booking_id = create_res.json()["id"]

        # Cancel
        cancel_res = client.post(
            f"/api/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "CANCELLED"

        # After cancelling, we should be able to book the exact same slot again
        rebook_res = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": start,
                "end_time": end,
                "purpose": "Rebook",
            },
        )
        assert rebook_res.status_code == 200

    def test_reschedule_booking(self, client, admin_token, bookable_asset):
        now = datetime.utcnow()
        start = (now + timedelta(hours=1)).isoformat()
        end = (now + timedelta(hours=2)).isoformat()

        create_res = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(bookable_asset.id),
                "start_time": start,
                "end_time": end,
                "purpose": "Meeting",
            },
        )
        booking_id = create_res.json()["id"]

        new_start = (now + timedelta(hours=3)).isoformat()
        new_end = (now + timedelta(hours=4)).isoformat()

        # Reschedule
        resched_res = client.post(
            f"/api/bookings/{booking_id}/reschedule",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"new_start": new_start, "new_end": new_end},
        )
        assert resched_res.status_code == 200
        assert resched_res.json()["status"] == "ACTIVE"

        # Original booking should be cancelled
        list_res = client.get(
            f"/api/bookings?asset_id={bookable_asset.id}", headers={"Authorization": f"Bearer {admin_token}"}
        )
        bookings = list_res.json()
        assert len(bookings) == 2
        for b in bookings:
            if b["id"] == booking_id:
                assert b["status"] == "CANCELLED"
            else:
                assert b["status"] == "ACTIVE"
