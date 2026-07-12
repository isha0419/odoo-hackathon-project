"""
AssetFlow — Initial seed data.

Creates the root admin user and seed departments/categories.
Run via:  python -m app.seed.initial_seed
"""

from app.db import SessionLocal
from app.models.user import User
from app.models.department import Department
from app.models.asset_category import AssetCategory
from app.models.enums import UserRole, ActiveStatus
from app.security import hash_password


def seed():
    """Idempotent seed — skips if admin already exists."""
    db = SessionLocal()
    try:
        # ── Root admin ────────────────────────────────────────────────────
        admin = db.query(User).filter(User.email == "admin@assetflow.io").first()
        if not admin:
            admin = User(
                name="AssetFlow Admin",
                email="admin@assetflow.io",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
                status=ActiveStatus.ACTIVE,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[SEED] Admin user created: {admin.id}")
        else:
            print("[SEED] Admin user already exists — skipping")

        # ── Seed departments ──────────────────────────────────────────────
        seed_depts = ["Engineering", "Operations", "Finance", "Human Resources"]
        for dept_name in seed_depts:
            existing = db.query(Department).filter(Department.name == dept_name).first()
            if not existing:
                dept = Department(name=dept_name)
                db.add(dept)
                print(f"[SEED] Department created: {dept_name}")
        db.commit()

        # ── Seed categories ───────────────────────────────────────────────
        seed_cats = [
            ("Laptops", {"brand": "text", "model": "text", "ram": "text"}),
            ("Furniture", {"type": "text", "material": "text"}),
            ("Vehicles", {"make": "text", "year": "number", "license_plate": "text"}),
            ("Lab Equipment", {"calibration_date": "date", "serial": "text"}),
            ("Projectors", {"lumens": "number", "resolution": "text"}),
        ]
        for cat_name, fields in seed_cats:
            existing = db.query(AssetCategory).filter(AssetCategory.name == cat_name).first()
            if not existing:
                cat = AssetCategory(name=cat_name, custom_fields=fields)
                db.add(cat)
                print(f"[SEED] Category created: {cat_name}")
        db.commit()

        print("[SEED] Done ✓")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
