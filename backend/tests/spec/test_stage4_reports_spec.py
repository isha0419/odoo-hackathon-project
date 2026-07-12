import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


def create_admin_token(client: TestClient, db: Session) -> tuple[str, str]:
    email = f"admin_report_spec_{uuid.uuid4()}@assetflow.io"
    # Create user
    response = client.post(
        "/api/auth/signup", json={"name": "Admin User Reports", "email": email, "password": "password123"}
    )
    assert response.status_code == 201

    # Force role to ADMIN in DB
    db.execute(text("UPDATE users SET role = 'ADMIN' WHERE email = :email"), {"email": email})
    db.commit()

    # Login
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return response.json()["access_token"], response.json()["user"]["id"]


def test_reports_endpoints(client: TestClient, db_session: Session):
    admin_token, admin_id = create_admin_token(client, db_session)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Test utilization
    resp = client.get("/api/reports/utilization", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Test most-used
    resp = client.get("/api/reports/most-used", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Test idle
    resp = client.get("/api/reports/idle", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Test maintenance-frequency
    resp = client.get("/api/reports/maintenance-frequency", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Test due
    resp = client.get("/api/reports/due", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Test booking-heatmap
    resp = client.get("/api/reports/booking-heatmap", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_reports_csv_export(client: TestClient, db_session: Session):
    admin_token, admin_id = create_admin_token(client, db_session)
    headers = {"Authorization": f"Bearer {admin_token}"}

    reports = ["utilization", "most-used", "idle", "maintenance-frequency", "due", "booking-heatmap"]

    for report in reports:
        resp = client.get(f"/api/reports/export?report={report}", headers=headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment; filename=" in resp.headers["content-disposition"]
        assert len(resp.text) > 0  # At least headers should be there
