from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.department import Department
from app.models.enums import AssetStatus, MaintenancePriority, MaintenanceStatus, UserRole
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
        password_hash="hashed",
        department_id=test_dept.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(
        sub=str(admin_user.id),
        role=admin_user.role.value,
        department_id=str(admin_user.department_id) if admin_user.department_id else None,
    )


@pytest.fixture
def bookable_category(db_session: Session) -> AssetCategory:
    cat = AssetCategory(name="Bookable Cat")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


@pytest.fixture
def standard_asset(db_session: Session, bookable_category: AssetCategory, test_dept: Department) -> Asset:
    asset = Asset(
        asset_tag="ASST-MAIN-001",
        name="Projector 1",
        category_id=bookable_category.id,
        department_id=test_dept.id,
        is_bookable=False,
        status=AssetStatus.AVAILABLE,
    )
    db_session.add(asset)
    db_session.commit()
    db_session.refresh(asset)
    return asset


class TestMaintenanceService:
    def test_raise_request(self, client, admin_token, standard_asset):
        response = client.post(
            "/api/maintenance",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(standard_asset.id),
                "issue_description": "Broken bulb",
                "priority": MaintenancePriority.MEDIUM.value,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == MaintenanceStatus.PENDING.value
        assert data["issue_description"] == "Broken bulb"

        # Verify asset status is unchanged (AVAILABLE)
        asset_response = client.get(
            f"/api/assets/{standard_asset.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert asset_response.status_code == 200
        assert asset_response.json()["status"] == AssetStatus.AVAILABLE.value

    def test_approve_request(self, client, admin_token, standard_asset):
        # Raise request
        res = client.post(
            "/api/maintenance",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "asset_id": str(standard_asset.id),
                "issue_description": "Broken bulb",
                "priority": MaintenancePriority.HIGH.value,
            },
        )
        req_id = res.json()["id"]

        # Approve it
        response = client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.APPROVED.value},
        )
        assert response.status_code == 200
        assert response.json()["status"] == MaintenanceStatus.APPROVED.value

        # Asset status should now be UNDER_MAINTENANCE
        asset_response = client.get(
            f"/api/assets/{standard_asset.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert asset_response.json()["status"] == AssetStatus.UNDER_MAINTENANCE.value

    def test_reject_request(self, client, admin_token, standard_asset):
        # Raise request
        res = client.post(
            "/api/maintenance",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"asset_id": str(standard_asset.id), "issue_description": "Scratched case"},
        )
        req_id = res.json()["id"]

        # Reject it
        response = client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.REJECTED.value},
        )
        assert response.status_code == 200
        assert response.json()["status"] == MaintenanceStatus.REJECTED.value

        # Asset status should still be AVAILABLE
        asset_response = client.get(
            f"/api/assets/{standard_asset.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert asset_response.json()["status"] == AssetStatus.AVAILABLE.value

    def test_full_lifecycle(self, client, admin_token, standard_asset):
        # Raise request
        res = client.post(
            "/api/maintenance",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"asset_id": str(standard_asset.id), "issue_description": "Broken screen"},
        )
        req_id = res.json()["id"]

        # Approve it
        client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.APPROVED.value},
        )

        # Assign Technician
        response = client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.TECHNICIAN_ASSIGNED.value, "technician_name": "Bob Fixer"},
        )
        assert response.status_code == 200

        # In Progress
        client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.IN_PROGRESS.value},
        )

        # Resolve
        response = client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.RESOLVED.value},
        )
        assert response.status_code == 200

        # Asset should be AVAILABLE again
        asset_response = client.get(
            f"/api/assets/{standard_asset.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert asset_response.json()["status"] == AssetStatus.AVAILABLE.value

    def test_invalid_transition(self, client, admin_token, standard_asset):
        res = client.post(
            "/api/maintenance",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"asset_id": str(standard_asset.id), "issue_description": "Broken screen"},
        )
        req_id = res.json()["id"]

        # Try to jump to RESOLVED from PENDING
        response = client.post(
            f"/api/maintenance/{req_id}/transition",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_status": MaintenanceStatus.RESOLVED.value},
        )
        assert response.status_code == 422
        assert "Invalid transition" in response.json()["detail"]
