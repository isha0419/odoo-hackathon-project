import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
import datetime
from datetime import timezone, timedelta

def create_admin_token(client: TestClient, db: Session) -> tuple[str, str]:
    admin_id = str(uuid.uuid4())
    # Create user
    response = client.post("/api/auth/signup", json={
        "name": "Admin User Stage3",
        "email": f"admin_spec3_{uuid.uuid4()}@assetflow.io",
        "password": "password123"
    })
    assert response.status_code == 201
    email = response.json()["email"]
    
    # Force role to ADMIN in DB
    db.execute(text(f"UPDATE users SET role = 'ADMIN' WHERE email = :email"), {"email": email})
    db.commit()
    
    # Login
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return response.json()["access_token"], response.json()["user"]["id"]

def test_stage3_crown_jewel_booking_overlap(client: TestClient, db_session: Session):
    """
    Test Crown Jewel #2 - Booking Overlap Block
    """
    admin_token, admin_id = create_admin_token(client, db_session)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Create Bookable Asset
    cat_resp = client.post("/api/categories", headers=admin_headers, json={"name": "Spaces", "custom_fields": {}})
    cat_id = cat_resp.json()["id"]
    asset_resp = client.post("/api/assets", headers=admin_headers, json={
        "name": "Conference Room B2",
        "category_id": cat_id,
        "is_bookable": True
    })
    asset_id = asset_resp.json()["id"]
    
    # 2. Create Booking 09:00 - 10:00 (Using absolute times from now for simplicity, or hardcoded for a future date)
    now = datetime.datetime.now(timezone.utc)
    start_time = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=1)
    
    booking1_resp = client.post("/api/bookings", headers=admin_headers, json={
        "asset_id": asset_id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    })
    assert booking1_resp.status_code == 201, f"Failed to book: {booking1_resp.text}"
    
    # 3. Attempt overlapping booking 09:30 - 10:30 (Should fail with 409)
    overlap_start = start_time + timedelta(minutes=30)
    overlap_end = end_time + timedelta(minutes=30)
    
    overlap_resp = client.post("/api/bookings", headers=admin_headers, json={
        "asset_id": asset_id,
        "start_time": overlap_start.isoformat(),
        "end_time": overlap_end.isoformat()
    })
    
    assert overlap_resp.status_code == 409, "Did not block booking overlap with 409"
    data = overlap_resp.json()
    
    # Verify exactly the Crown Jewel #2 required response shape
    assert data["error"] == "booking_overlap"
    assert "conflicting_booking" in data
    
    # 4. Attempt non-overlapping booking 10:00 - 11:00 (Should succeed)
    good_start = end_time
    good_end = good_start + timedelta(hours=1)
    
    good_resp = client.post("/api/bookings", headers=admin_headers, json={
        "asset_id": asset_id,
        "start_time": good_start.isoformat(),
        "end_time": good_end.isoformat()
    })
    assert good_resp.status_code == 201, "Failed to book non-overlapping adjacent slot"

def test_stage3_maintenance_kanban(client: TestClient, db_session: Session):
    """
    Test maintenance request transition state machine
    """
    admin_token, admin_id = create_admin_token(client, db_session)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    cat_id = client.post("/api/categories", headers=admin_headers, json={"name": "HVAC", "custom_fields": {}}).json()["id"]
    asset_id = client.post("/api/assets", headers=admin_headers, json={"name": "AC Unit", "category_id": cat_id}).json()["id"]
    
    # Raise Maintenance Request -> PENDING
    maint_resp = client.post("/api/maintenance", headers=admin_headers, json={
        "asset_id": asset_id,
        "issue_description": "Not cooling",
        "priority": "HIGH"
    })
    assert maint_resp.status_code == 201
    maint_id = maint_resp.json()["id"]
    assert maint_resp.json()["status"] == "PENDING"
    
    # Asset should still be AVAILABLE
    assert client.get(f"/api/assets/{asset_id}", headers=admin_headers).json()["status"] == "AVAILABLE"
    
    # Transition to APPROVED -> asset UNDER_MAINTENANCE
    appr_resp = client.post(f"/api/maintenance/{maint_id}/transition", headers=admin_headers, json={
        "to_status": "APPROVED"
    })
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "APPROVED"
    assert client.get(f"/api/assets/{asset_id}", headers=admin_headers).json()["status"] == "UNDER_MAINTENANCE"
    
    # Transition to RESOLVED -> asset AVAILABLE
    res_resp = client.post(f"/api/maintenance/{maint_id}/transition", headers=admin_headers, json={
        "to_status": "RESOLVED"
    })
    assert res_resp.status_code == 200
    assert client.get(f"/api/assets/{asset_id}", headers=admin_headers).json()["status"] == "AVAILABLE"
