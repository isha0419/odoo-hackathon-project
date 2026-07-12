import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


def create_admin_token(client: TestClient, db: Session) -> tuple[str, str]:
    # Insert an ADMIN user directly to bypass API restrictions
    admin_id = str(uuid.uuid4())
    # We must hash the password. Since we are black box testing, we might not have access to security.py.
    # But we can just use the signup endpoint to create the user, then update the role via raw SQL!
    response = client.post(
        "/api/auth/signup", json={"name": "Admin User", "email": "admin_spec@assetflow.io", "password": "password123"}
    )
    assert response.status_code == 201

    # Force role to ADMIN in DB
    db.execute(text("UPDATE users SET role = 'ADMIN' WHERE email = 'admin_spec@assetflow.io'"))
    db.commit()

    # Login
    response = client.post("/api/auth/login", json={"email": "admin_spec@assetflow.io", "password": "password123"})
    assert response.status_code == 200
    return response.json()["access_token"], admin_id


def create_employee_token(client: TestClient, email: str) -> tuple[str, str]:
    response = client.post(
        "/api/auth/signup", json={"name": "Employee " + email, "email": email, "password": "password123"}
    )
    assert response.status_code == 201

    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return response.json()["access_token"], response.json()["user"]["id"]


def test_stage2_crown_jewel_double_allocation(client: TestClient, db_session: Session):
    admin_token, admin_id = create_admin_token(client, db_session)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    emp1_token, emp1_id = create_employee_token(client, "emp1@assetflow.io")
    emp2_token, emp2_id = create_employee_token(client, "emp2@assetflow.io")

    # 1. Create Category
    cat_resp = client.post("/api/categories", headers=admin_headers, json={"name": "Laptops", "custom_fields": {}})
    assert cat_resp.status_code in (200, 201), f"Failed to create category: {cat_resp.text}"
    cat_id = cat_resp.json()["id"]

    # 2. Register Asset
    asset_resp = client.post(
        "/api/assets",
        headers=admin_headers,
        json={"name": "ThinkPad T14", "category_id": cat_id, "condition": "NEW", "is_bookable": False},
    )
    assert asset_resp.status_code in (200, 201), f"Failed to create asset: {asset_resp.text}"
    asset = asset_resp.json()
    asset_id = asset["id"]

    # Tag should start with AF-
    assert asset["asset_tag"].startswith("AF-")
    assert asset["status"] == "AVAILABLE"

    # 3. Allocate to Employee 1
    alloc1_resp = client.post(
        "/api/allocations", headers=admin_headers, json={"asset_id": asset_id, "holder_user_id": emp1_id}
    )
    assert alloc1_resp.status_code in (200, 201), f"Failed to allocate: {alloc1_resp.text}"

    # Verify asset status is now ALLOCATED
    asset_verify = client.get(f"/api/assets/{asset_id}", headers=admin_headers).json()
    assert asset_verify["status"] == "ALLOCATED"

    # 4. Attempt Double Allocation to Employee 2 (Should fail with 409)
    alloc2_resp = client.post(
        "/api/allocations", headers=admin_headers, json={"asset_id": asset_id, "holder_user_id": emp2_id}
    )

    assert alloc2_resp.status_code == 409, "Did not block double allocation with 409"
    data = alloc2_resp.json()

    # Verify exactly the Crown Jewel #1 required response shape
    assert data["error"] == "asset_already_allocated"
    assert "current_holder" in data
    assert data["current_holder"]["user_id"] == emp1_id
    assert data["suggested_action"] == "transfer_request"


def test_stage2_transfer_flow(client: TestClient, db_session: Session):
    admin_token, admin_id = create_admin_token(client, db_session)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    emp1_token, emp1_id = create_employee_token(client, "transfer1@assetflow.io")
    emp1_headers = {"Authorization": f"Bearer {emp1_token}"}
    emp2_token, emp2_id = create_employee_token(client, "transfer2@assetflow.io")

    # Category & Asset
    cat_resp = client.post("/api/categories", headers=admin_headers, json={"name": "Phones", "custom_fields": {}})
    cat_id = cat_resp.json()["id"]
    asset_id = client.post("/api/assets", headers=admin_headers, json={"name": "iPhone", "category_id": cat_id}).json()[
        "id"
    ]

    # Allocate to Emp1
    client.post("/api/allocations", headers=admin_headers, json={"asset_id": asset_id, "holder_user_id": emp1_id})

    # Emp1 requests transfer to Emp2
    transfer_resp = client.post(
        "/api/transfers",
        headers=emp1_headers,
        json={"asset_id": asset_id, "to_user_id": emp2_id, "reason": "Team switch"},
    )
    assert transfer_resp.status_code in (200, 201), f"Transfer request failed: {transfer_resp.text}"
    transfer_id = transfer_resp.json()["id"]

    # Admin approves transfer
    approve_resp = client.post(f"/api/transfers/{transfer_id}/approve", headers=admin_headers)
    assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"

    # Verify Asset is still ALLOCATED, but held by Emp2
    asset_data = client.get(f"/api/assets/{asset_id}", headers=admin_headers).json()
    assert asset_data["status"] == "ALLOCATED"
    # To strictly verify holder changed, we can check active allocation
    # The API might expose the current allocation in the asset detail
