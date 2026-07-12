"""AssetFlow — Full demo simulation data generator (design.md Section 13).

Deterministic (random.seed(42)), timestamps always relative to now(). Default
mode upserts by natural key (safe to re-run); --reset truncates every seeded
table first for a guaranteed-clean slate.

Run via: docker compose run --rm api python -m app.seed.seed [--reset]
"""

import random
import sys
from datetime import UTC, date, datetime, timedelta

from psycopg2.extras import DateTimeTZRange
from sqlalchemy import text

from app.db import SessionLocal
from app.models.activity_log import ActivityLog
from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.audit_cycle import AuditCycle
from app.models.audit_cycle_auditor import AuditCycleAuditor
from app.models.audit_item import AuditItem
from app.models.booking import Booking
from app.models.department import Department
from app.models.enums import (
    ActiveStatus,
    AllocationStatus,
    AssetCondition,
    AssetStatus,
    AuditCycleStatus,
    AuditVerification,
    BookingStatus,
    MaintenancePriority,
    MaintenanceStatus,
    NotificationType,
    TransferStatus,
    UserRole,
)
from app.models.maintenance_request import MaintenanceRequest
from app.models.notification import Notification
from app.models.transfer_request import TransferRequest
from app.models.user import User
from app.security import hash_password

random.seed(42)

RESET = "--reset" in sys.argv

TRUNCATE_TABLES = [
    "activity_logs",
    "notifications",
    "audit_items",
    "audit_cycle_auditors",
    "audit_cycles",
    "maintenance_requests",
    "bookings",
    "transfer_requests",
    "allocations",
    "assets",
    "asset_categories",
    "users",
    "departments",
]


def now() -> datetime:
    return datetime.now(UTC)


def ago(**kwargs) -> datetime:
    return now() - timedelta(**kwargs)


def truncate_all(db):
    db.execute(text(f"TRUNCATE {', '.join(TRUNCATE_TABLES)} RESTART IDENTITY CASCADE"))
    db.execute(text("ALTER SEQUENCE asset_tag_seq RESTART WITH 1"))
    db.commit()


def get_or_create(db, model, lookup: dict, defaults: dict | None = None):
    """Upsert-by-natural-key: return (obj, created) without ever duplicating on natural key."""
    obj = db.query(model).filter_by(**lookup).first()
    if obj:
        return obj, False
    obj = model(**lookup, **(defaults or {}))
    db.add(obj)
    db.flush()
    return obj, True


def next_asset_tag(db) -> str:
    val = db.execute(text("SELECT nextval('asset_tag_seq')")).scalar()
    return f"AF-{val:04d}"


# ─────────────────────────────────────────────────────────────────────────────
# Departments
# ─────────────────────────────────────────────────────────────────────────────


def seed_departments(db) -> dict[str, Department]:
    depts: dict[str, Department] = {}
    for name in ["Engineering", "Facilities", "Field Ops", "IT", "Admin"]:
        dept, _ = get_or_create(db, Department, {"name": name})
        depts[name] = dept
    db.commit()

    # Hierarchy: Field Ops (East) is a child of Field Ops
    field_ops_east, _ = get_or_create(
        db, Department, {"name": "Field Ops (East)"}, {"parent_department_id": depts["Field Ops"].id}
    )
    depts["Field Ops (East)"] = field_ops_east
    db.commit()

    # One inactive department to exercise status filtering
    depts["IT"].status = ActiveStatus.INACTIVE
    db.commit()

    return depts


# ─────────────────────────────────────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────────────────────────────────────


def seed_categories(db) -> dict[str, AssetCategory]:
    specs = [
        ("Electronics", {"warranty_months": "int"}),
        ("Vehicles", {"registration_no": "text"}),
        ("Furniture", {}),
        ("Equipment", {}),
        ("Spaces", {}),
    ]
    cats: dict[str, AssetCategory] = {}
    for name, custom_fields in specs:
        cat, created = get_or_create(db, AssetCategory, {"name": name}, {"custom_fields": custom_fields})
        if not created and cat.custom_fields != custom_fields:
            cat.custom_fields = custom_fields
        cats[name] = cat
    db.commit()
    return cats


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────

DEMO_PASSWORD = "password123"

EMPLOYEE_NAMES = [
    "Priya Shah",
    "Arjun Nair",
    "Meera Iyer",
    "Karan Mehta",
    "Ananya Rao",
    "Vikram Singh",
    "Sneha Kulkarni",
    "Rahul Verma",
    "Divya Pillai",
    "Aditya Joshi",
    "Ishaan Kapoor",
    "Neha Desai",
    "Rohan Bhatt",
    "Kavya Menon",
    "Siddharth Gupta",
]


def seed_users(db, depts: dict[str, Department]) -> dict[str, User]:
    users: dict[str, User] = {}

    admin, _ = get_or_create(
        db,
        User,
        {"email": "admin@assetflow.io"},
        {"name": "Admin User", "password_hash": hash_password(DEMO_PASSWORD), "role": UserRole.ADMIN},
    )
    users["admin"] = admin

    mgr_specs = [("asset.manager1@assetflow.io", "Alex Kim"), ("asset.manager2@assetflow.io", "Jordan Lee")]
    for email, name in mgr_specs:
        u, _ = get_or_create(
            db,
            User,
            {"email": email},
            {"name": name, "password_hash": hash_password(DEMO_PASSWORD), "role": UserRole.ASSET_MANAGER},
        )
        users[email] = u

    head_dept_names = ["Engineering", "Facilities", "Field Ops", "Admin"]
    head_names = ["Priya Head-Eng", "Farah Head-Fac", "Oscar Head-Ops", "Amit Head-Admin"]
    for dept_name, head_name in zip(head_dept_names, head_names, strict=True):
        email = f"{dept_name.lower().replace(' ', '.')}.head@assetflow.io"
        u, _ = get_or_create(
            db,
            User,
            {"email": email},
            {
                "name": head_name,
                "password_hash": hash_password(DEMO_PASSWORD),
                "role": UserRole.DEPARTMENT_HEAD,
                "department_id": depts[dept_name].id,
            },
        )
        users[email] = u
        depts[dept_name].head_user_id = u.id
    db.commit()

    dept_cycle = ["Engineering", "Facilities", "Field Ops", "IT", "Admin", "Field Ops (East)"]
    for i, name in enumerate(EMPLOYEE_NAMES):
        email = name.lower().replace(" ", ".") + "@assetflow.io"
        dept = depts[dept_cycle[i % len(dept_cycle)]]
        u, _ = get_or_create(
            db,
            User,
            {"email": email},
            {
                "name": name,
                "password_hash": hash_password(DEMO_PASSWORD),
                "role": UserRole.EMPLOYEE,
                "department_id": dept.id,
            },
        )
        users[name] = u
    db.commit()

    return users


# ─────────────────────────────────────────────────────────────────────────────
# Assets
# ─────────────────────────────────────────────────────────────────────────────

ASSET_NAMES_BY_CATEGORY = {
    "Electronics": ["Laptop Dell XPS 13", "Laptop MacBook Pro", "Monitor LG 27in", "iPad Pro", "Desktop Workstation"],
    "Vehicles": ["Delivery Van", "Service Truck"],
    "Furniture": ["Office Desk", "Ergonomic Chair", "Standing Desk", "Filing Cabinet", "Bookshelf"],
    "Equipment": ["Projector Cart", "Label Printer", "3D Printer", "Toolkit Set", "Power Drill"],
    "Spaces": ["Training Hall"],
}

# These get created first, with exact (unsuffixed) names, since specific screens/demos
# reference them by name directly (Conference Room B2 for the booking-overlap demo).
BOOKABLE_ANCHOR_NAMES = [
    ("Conference Room A1", "Spaces"),
    ("Conference Room B2", "Spaces"),
    ("Huddle Room 1", "Spaces"),
    ("Company Car Sedan", "Vehicles"),
    ("Company Car SUV", "Vehicles"),
]

LOCATIONS = ["HQ-Floor1", "HQ-Floor2", "HQ-Floor3", "Warehouse-A", "Remote-Site"]


def _make_asset(db, name, cat_id, status, is_bookable=False):
    tag = next_asset_tag(db)
    asset = Asset(
        asset_tag=tag,
        name=name,
        category_id=cat_id,
        condition=random.choice([AssetCondition.NEW, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.FAIR]),
        location=random.choice(LOCATIONS),
        acquisition_date=date.today() - timedelta(days=random.randint(30, 365 * 6)),
        acquisition_cost=random.randint(200, 5000),
        is_bookable=is_bookable,
        status=status,
    )
    db.add(asset)
    db.flush()
    return asset


def seed_assets(db, cats: dict[str, AssetCategory]) -> dict[str, Asset]:
    assets: dict[str, Asset] = {}

    # Build the ~50-asset distribution: 29 AVAILABLE, 13 ALLOCATED, 4 UNDER_MAINTENANCE,
    # 2 LOST, 1 RETIRED, 1 DISPOSED = 50 total. AF-0114 (Priya's laptop) is separate/anchored.
    distribution = (
        ["AVAILABLE"] * 29
        + ["ALLOCATED"] * 13
        + ["UNDER_MAINTENANCE"] * 4
        + ["LOST"] * 2
        + ["RETIRED"] * 1
        + ["DISPOSED"] * 1
    )
    random.shuffle(distribution)

    # The 5 bookable anchors always count as AVAILABLE (bookable rooms/vehicles up for use).
    remaining_statuses = [s for s in distribution if s != "AVAILABLE"] + ["AVAILABLE"] * (
        distribution.count("AVAILABLE") - len(BOOKABLE_ANCHOR_NAMES)
    )

    for name, cat_name in BOOKABLE_ANCHOR_NAMES:
        existing = db.query(Asset).filter(Asset.name == name).first()
        asset = existing or _make_asset(db, name, cats[cat_name].id, AssetStatus.AVAILABLE, is_bookable=True)
        assets[name] = asset
    db.commit()

    category_names = list(ASSET_NAMES_BY_CATEGORY.keys())
    per_name_counter: dict[str, int] = {}
    cat_idx = 0
    for status_str in remaining_statuses:
        cat_name = category_names[cat_idx % len(category_names)]
        base_names = ASSET_NAMES_BY_CATEGORY[cat_name]
        base_name = base_names[cat_idx % len(base_names)]
        cat_idx += 1

        per_name_counter[base_name] = per_name_counter.get(base_name, 0) + 1
        name = f"{base_name} #{per_name_counter[base_name]}"

        existing = db.query(Asset).filter(Asset.name == name).first()
        if existing:
            assets[name] = existing
            continue

        assets[name] = _make_asset(db, name, cats[cat_name].id, AssetStatus[status_str])

    db.commit()

    # Anchor: Laptop AF-0114 allocated to Priya Shah / Engineering.
    anchor = db.query(Asset).filter(Asset.asset_tag == "AF-0114").first()
    if not anchor:
        anchor = Asset(
            asset_tag="AF-0114",
            name="Laptop AF-0114",
            category_id=cats["Electronics"].id,
            condition=AssetCondition.GOOD,
            location="HQ-Floor2",
            acquisition_date=date.today() - timedelta(days=200),
            acquisition_cost=1800,
            is_bookable=False,
            status=AssetStatus.ALLOCATED,
        )
        db.add(anchor)
        db.commit()
    assets["__anchor_laptop__"] = anchor

    return assets


# ─────────────────────────────────────────────────────────────────────────────
# Allocations
# ─────────────────────────────────────────────────────────────────────────────


def seed_allocations(db, assets: dict[str, Asset], users: dict[str, User], depts: dict[str, Department]):
    if db.query(Allocation).count() > 0:
        return  # already seeded — allocations have no clean natural key, skip whole block

    admin = users["admin"]
    priya = users["Priya Shah"]
    employees = [users[n] for n in EMPLOYEE_NAMES]

    # Anchor allocation: AF-0114 -> Priya Shah / Engineering, ACTIVE, not overdue.
    anchor = assets["__anchor_laptop__"]
    db.add(
        Allocation(
            asset_id=anchor.id,
            holder_user_id=priya.id,
            holder_department_id=depts["Engineering"].id,
            allocated_by=admin.id,
            allocated_at=ago(days=14),
            expected_return_date=date.today() + timedelta(days=16),
            status=AllocationStatus.ACTIVE,
        )
    )

    allocated_assets = [a for a in assets.values() if a.status == AssetStatus.ALLOCATED and a.asset_tag != "AF-0114"]
    overdue_offsets = [2, 5, 9]
    for i, asset in enumerate(allocated_assets):
        holder = random.choice(employees)
        is_overdue = i < len(overdue_offsets)
        expected_return = (
            date.today() - timedelta(days=overdue_offsets[i])
            if is_overdue
            else date.today() + timedelta(days=random.randint(3, 30))
        )
        db.add(
            Allocation(
                asset_id=asset.id,
                holder_user_id=holder.id,
                holder_department_id=holder.department_id,
                allocated_by=admin.id,
                allocated_at=ago(days=random.randint(3, 60)),
                expected_return_date=expected_return,
                status=AllocationStatus.ACTIVE,
            )
        )

    # A few historical RETURNED allocations against AVAILABLE assets, for allocation-history screens.
    available_assets = [a for a in assets.values() if a.status == AssetStatus.AVAILABLE]
    for asset in available_assets[:5]:
        holder = random.choice(employees)
        allocated_at = ago(days=random.randint(60, 200))
        returned_at = allocated_at + timedelta(days=random.randint(10, 40))
        db.add(
            Allocation(
                asset_id=asset.id,
                holder_user_id=holder.id,
                holder_department_id=holder.department_id,
                allocated_by=admin.id,
                allocated_at=allocated_at,
                expected_return_date=(allocated_at + timedelta(days=30)).date(),
                returned_at=returned_at,
                return_condition_notes=random.choice(["Good condition", "Minor wear", "Fine"]),
                status=AllocationStatus.RETURNED,
            )
        )

    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Transfers
# ─────────────────────────────────────────────────────────────────────────────


def seed_transfers(db, assets: dict[str, Asset], users: dict[str, User]):
    if db.query(TransferRequest).count() > 0:
        return

    admin = users["admin"]
    employees = [users[n] for n in EMPLOYEE_NAMES]

    active_allocs = (
        db.query(Allocation)
        .filter(Allocation.status == AllocationStatus.ACTIVE, Allocation.asset_id != assets["__anchor_laptop__"].id)
        .limit(3)
        .all()
    )
    if len(active_allocs) < 3:
        return

    # 2 REQUESTED
    for alloc in active_allocs[:2]:
        to_user = random.choice([e for e in employees if e.id != alloc.holder_user_id])
        db.add(
            TransferRequest(
                asset_id=alloc.asset_id,
                from_user_id=alloc.holder_user_id,
                to_user_id=to_user.id,
                requested_by=alloc.holder_user_id,
                reason="Reassignment",
                status=TransferStatus.REQUESTED,
                created_at=ago(hours=random.randint(2, 48)),
            )
        )

    # 1 COMPLETED (historical, doesn't touch current allocation state)
    completed_alloc = active_allocs[2]
    to_user = random.choice([e for e in employees if e.id != completed_alloc.holder_user_id])
    db.add(
        TransferRequest(
            asset_id=completed_alloc.asset_id,
            from_user_id=completed_alloc.holder_user_id,
            to_user_id=to_user.id,
            requested_by=completed_alloc.holder_user_id,
            approved_by=admin.id,
            reason="Department move",
            status=TransferStatus.COMPLETED,
            created_at=ago(days=10),
            resolved_at=ago(days=9),
        )
    )
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Bookings
# ─────────────────────────────────────────────────────────────────────────────


def seed_bookings(db, assets: dict[str, Asset], users: dict[str, User]):
    if db.query(Booking).count() > 0:
        return

    admin = users["admin"]
    employees = [users[n] for n in EMPLOYEE_NAMES]
    bookable = [a for a in assets.values() if a.is_bookable]
    conf_b2 = next(a for a in bookable if a.name == "Conference Room B2")

    today = date.today()
    demo_start = datetime(today.year, today.month, today.day, 9, 0, tzinfo=UTC)
    demo_end = datetime(today.year, today.month, today.day, 10, 0, tzinfo=UTC)
    db.add(
        Booking(
            asset_id=conf_b2.id,
            booked_by_user_id=admin.id,
            time_range=DateTimeTZRange(demo_start, demo_end, "[)"),
            status=BookingStatus.UPCOMING,
        )
    )
    db.flush()

    other_bookable = [a for a in bookable if a.id != conf_b2.id]
    offsets = [
        (-48, -47),  # completed, 2 days ago
        (-2, -1),  # completed, earlier today
        (2, 3),  # upcoming, later today
        (24, 25),  # upcoming, tomorrow
        (48, 50),  # upcoming, day after
        (72, 73),  # upcoming
        (96, 98),  # upcoming
    ]
    for i, (start_h, end_h) in enumerate(offsets):
        asset = other_bookable[i % len(other_bookable)]
        booker = random.choice(employees)
        start = now() + timedelta(hours=start_h)
        end = now() + timedelta(hours=end_h)
        # avoid accidental overlap on the same asset within our own seed data
        overlap = (
            db.query(Booking)
            .filter(
                Booking.asset_id == asset.id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.time_range.op("&&")(DateTimeTZRange(start, end, "[)")),
            )
            .first()
        )
        if overlap:
            continue
        db.add(
            Booking(
                asset_id=asset.id,
                booked_by_user_id=booker.id,
                time_range=DateTimeTZRange(start, end, "[)"),
                status=BookingStatus.UPCOMING,
            )
        )
        db.flush()

    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance
# ─────────────────────────────────────────────────────────────────────────────


def seed_maintenance(db, assets: dict[str, Asset], users: dict[str, User]):
    if db.query(MaintenanceRequest).count() > 0:
        return

    admin = users["admin"]
    mgr = users["asset.manager1@assetflow.io"]
    employees = [users[n] for n in EMPLOYEE_NAMES]

    under_maintenance = [a for a in assets.values() if a.status == AssetStatus.UNDER_MAINTENANCE]
    available = [a for a in assets.values() if a.status == AssetStatus.AVAILABLE]

    # Every UNDER_MAINTENANCE asset must have an open maintenance request (consistency assertion).
    statuses_for_um = [
        MaintenanceStatus.APPROVED,
        MaintenanceStatus.APPROVED,
        MaintenanceStatus.TECHNICIAN_ASSIGNED,
        MaintenanceStatus.IN_PROGRESS,
    ]
    for asset, status in zip(under_maintenance, statuses_for_um, strict=False):
        req = MaintenanceRequest(
            asset_id=asset.id,
            raised_by=random.choice(employees).id,
            issue_description=random.choice(
                ["Not powering on", "Making unusual noise", "Physical damage", "Needs calibration"]
            ),
            priority=random.choice([MaintenancePriority.MEDIUM, MaintenancePriority.HIGH]),
            status=status,
            created_at=ago(days=random.randint(1, 5)),
        )
        if status in (MaintenanceStatus.APPROVED, MaintenanceStatus.TECHNICIAN_ASSIGNED, MaintenanceStatus.IN_PROGRESS):
            req.approved_by = mgr.id
        if status in (MaintenanceStatus.TECHNICIAN_ASSIGNED, MaintenanceStatus.IN_PROGRESS):
            req.technician_name = random.choice(["Sam (Contractor)", "Priya Tech Services", "Internal IT"])
        db.add(req)

    # PENDING, RESOLVED, REJECTED on AVAILABLE assets (no side-effect on their current status).
    pending_asset, resolved_asset, rejected_asset = available[0], available[1], available[2]

    db.add(
        MaintenanceRequest(
            asset_id=pending_asset.id,
            raised_by=random.choice(employees).id,
            issue_description="Screen flickering intermittently",
            priority=MaintenancePriority.LOW,
            status=MaintenanceStatus.PENDING,
            created_at=ago(hours=6),
        )
    )
    db.add(
        MaintenanceRequest(
            asset_id=resolved_asset.id,
            raised_by=random.choice(employees).id,
            issue_description="Battery replacement",
            priority=MaintenancePriority.MEDIUM,
            status=MaintenanceStatus.RESOLVED,
            approved_by=mgr.id,
            technician_name="Internal IT",
            created_at=ago(days=10),
            resolved_at=ago(days=7),
        )
    )
    db.add(
        MaintenanceRequest(
            asset_id=rejected_asset.id,
            raised_by=random.choice(employees).id,
            issue_description="Requested cosmetic repaint",
            priority=MaintenancePriority.LOW,
            status=MaintenanceStatus.REJECTED,
            approved_by=admin.id,
            created_at=ago(days=4),
        )
    )
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Audit cycles
# ─────────────────────────────────────────────────────────────────────────────


def seed_audit(db, assets: dict[str, Asset], users: dict[str, User], depts: dict[str, Department]):
    if db.query(AuditCycle).count() > 0:
        return

    admin = users["admin"]
    mgr = users["asset.manager1@assetflow.io"]
    head_eng = users["engineering.head@assetflow.io"]

    # OPEN cycle: "Q3 audit: Engineering, 1-15 Jul" — left OPEN for the live demo close.
    open_cycle = AuditCycle(
        name="Q3 audit: Engineering, 1-15 Jul",
        scope_department_id=depts["Engineering"].id,
        start_date=date.today() - timedelta(days=10),
        end_date=date.today() + timedelta(days=5),
        status=AuditCycleStatus.OPEN,
        created_by=admin.id,
        created_at=ago(days=10),
    )
    db.add(open_cycle)
    db.flush()

    for auditor in [mgr, head_eng]:
        db.add(AuditCycleAuditor(audit_cycle_id=open_cycle.id, user_id=auditor.id))

    eng_assets = list(assets.values())[:6]
    verifications = [
        AuditVerification.VERIFIED,
        AuditVerification.VERIFIED,
        AuditVerification.MISSING,
        AuditVerification.DAMAGED,
        AuditVerification.PENDING,
        AuditVerification.PENDING,
    ]
    for asset, verification in zip(eng_assets, verifications, strict=False):
        item = AuditItem(
            audit_cycle_id=open_cycle.id,
            asset_id=asset.id,
            expected_location=asset.location,
            verification=verification,
        )
        if verification != AuditVerification.PENDING:
            item.verified_by = mgr.id
            item.verified_at = ago(days=random.randint(1, 5))
            item.notes = "Checked during walkthrough"
        db.add(item)
    db.flush()

    # CLOSED cycle: history, scoped to IT, with one already-resolved discrepancy.
    it_assets = [a for a in assets.values() if a.location == "Warehouse-A"][:4] or list(assets.values())[6:10]
    closed_cycle = AuditCycle(
        name="Q2 audit: IT, 1-15 Apr",
        scope_department_id=depts["IT"].id,
        start_date=date.today() - timedelta(days=100),
        end_date=date.today() - timedelta(days=85),
        status=AuditCycleStatus.CLOSED,
        created_by=admin.id,
        created_at=ago(days=100),
        closed_at=ago(days=84),
    )
    db.add(closed_cycle)
    db.flush()
    db.add(AuditCycleAuditor(audit_cycle_id=closed_cycle.id, user_id=mgr.id))

    closed_verifications = [
        AuditVerification.VERIFIED,
        AuditVerification.VERIFIED,
        AuditVerification.MISSING,
        AuditVerification.VERIFIED,
    ]
    for asset, verification in zip(it_assets, closed_verifications, strict=False):
        db.add(
            AuditItem(
                audit_cycle_id=closed_cycle.id,
                asset_id=asset.id,
                expected_location=asset.location,
                verification=verification,
                verified_by=mgr.id,
                verified_at=ago(days=85),
                notes="Historical audit",
            )
        )
    db.commit()

    return open_cycle, closed_cycle


# ─────────────────────────────────────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────────────────────────────────────


def seed_notifications(db, assets: dict[str, Asset], users: dict[str, User]):
    if db.query(Notification).count() > 0:
        return

    priya = users["Priya Shah"]
    admin = users["admin"]
    anchor = assets["__anchor_laptop__"]
    conf_b2 = next(a for a in assets.values() if a.name == "Conference Room B2")

    specs = [
        (
            priya.id,
            NotificationType.ASSET_ASSIGNED,
            f"You have been allocated asset {anchor.asset_tag} ({anchor.name}).",
            True,
            14 * 24,
        ),
        (admin.id, NotificationType.MAINTENANCE_APPROVED, "Maintenance request approved for an asset.", True, 5 * 24),
        (admin.id, NotificationType.BOOKING_CONFIRMED, f"Booking confirmed for {conf_b2.name}.", False, 2),
        (admin.id, NotificationType.TRANSFER_APPROVED, "Asset transfer has been approved.", True, 9 * 24),
        (priya.id, NotificationType.OVERDUE_RETURN, "Your allocation is overdue for return.", False, 6),
        (admin.id, NotificationType.OVERDUE_RETURN, "An allocation is overdue for return.", False, 3),
        (
            admin.id,
            NotificationType.AUDIT_DISCREPANCY,
            "Discrepancy: asset marked MISSING in Q2 audit: IT.",
            True,
            84 * 24,
        ),
        (admin.id, NotificationType.BOOKING_CANCELLED, "A booking was cancelled.", True, 30 * 24),
        (admin.id, NotificationType.MAINTENANCE_REJECTED, "A maintenance request was rejected.", True, 4 * 24),
        (admin.id, NotificationType.BOOKING_REMINDER, f"Reminder: upcoming booking for {conf_b2.name} soon.", False, 1),
    ]
    for recipient_id, ntype, message, is_read, hours_ago in specs:
        db.add(
            Notification(
                recipient_user_id=recipient_id,
                type=ntype,
                message=message,
                is_read=is_read,
                created_at=ago(hours=hours_ago),
            )
        )
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Activity logs
# ─────────────────────────────────────────────────────────────────────────────


def seed_activity_logs(db, assets: dict[str, Asset], users: dict[str, User]):
    if db.query(ActivityLog).count() > 0:
        return

    admin = users["admin"]
    mgr = users["asset.manager1@assetflow.io"]
    priya = users["Priya Shah"]
    anchor = assets["__anchor_laptop__"]

    actions = [
        ("asset.registered", "asset", 5 * 24),
        ("asset.allocated", "asset", 14 * 24),
        ("asset.returned", "asset", 40 * 24),
        ("asset.transferred", "asset", 9 * 24),
        ("asset.status_changed", "asset", 60 * 24),
        ("booking.created", "booking", 2),
        ("booking.cancelled", "booking", 30 * 24),
        ("maintenance.raised", "maintenance", 5 * 24),
        ("maintenance.approved", "maintenance", 4 * 24),
        ("maintenance.resolved", "maintenance", 7 * 24),
        ("audit.cycle_closed", "audit_cycle", 84 * 24),
        ("user.role_changed", "user", 20 * 24),
        ("transfer.requested", "transfer", 48),
    ]
    actors = [admin, mgr, priya]
    count = 0
    while count < 30:
        for action, entity_type, hours_ago in actions:
            if count >= 30:
                break
            db.add(
                ActivityLog(
                    actor_user_id=random.choice(actors).id,
                    action=action,
                    entity_type=entity_type,
                    entity_id=anchor.id if entity_type == "asset" else None,
                    metadata_={},
                    created_at=ago(hours=hours_ago + count),
                )
            )
            count += 1
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Consistency assertions
# ─────────────────────────────────────────────────────────────────────────────


def run_consistency_assertions(db):
    failures = []

    allocated_without_one_active = db.execute(
        text(
            """
            SELECT a.asset_tag, COUNT(al.id) AS active_count
            FROM assets a
            LEFT JOIN allocations al ON al.asset_id = a.id AND al.returned_at IS NULL
            WHERE a.status = 'ALLOCATED'
            GROUP BY a.id, a.asset_tag
            HAVING COUNT(al.id) != 1
            """
        )
    ).fetchall()
    if allocated_without_one_active:
        failures.append(f"ALLOCATED assets without exactly 1 active allocation: {allocated_without_one_active}")

    available_with_active = db.execute(
        text(
            """
            SELECT a.asset_tag, COUNT(al.id) AS active_count
            FROM assets a
            JOIN allocations al ON al.asset_id = a.id AND al.returned_at IS NULL
            WHERE a.status = 'AVAILABLE'
            GROUP BY a.id, a.asset_tag
            """
        )
    ).fetchall()
    if available_with_active:
        failures.append(f"AVAILABLE assets with an active allocation: {available_with_active}")

    under_maintenance_without_request = db.execute(
        text(
            """
            SELECT a.asset_tag
            FROM assets a
            WHERE a.status = 'UNDER_MAINTENANCE'
            AND NOT EXISTS (
                SELECT 1 FROM maintenance_requests mr
                WHERE mr.asset_id = a.id
                AND mr.status IN ('APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS')
            )
            """
        )
    ).fetchall()
    if under_maintenance_without_request:
        failures.append(
            f"UNDER_MAINTENANCE assets without an open maintenance request: {under_maintenance_without_request}"
        )

    overlapping_bookings = db.execute(
        text(
            """
            SELECT b1.id, b2.id
            FROM bookings b1
            JOIN bookings b2 ON b1.asset_id = b2.asset_id AND b1.id < b2.id
            WHERE b1.status != 'CANCELLED' AND b2.status != 'CANCELLED'
            AND b1.time_range && b2.time_range
            """
        )
    ).fetchall()
    if overlapping_bookings:
        failures.append(f"Overlapping non-cancelled bookings found: {overlapping_bookings}")

    overdue_count = db.execute(
        text(
            """
            SELECT count(*) FROM allocations
            WHERE expected_return_date < CURRENT_DATE AND status = 'ACTIVE'
            """
        )
    ).scalar()
    if overdue_count < 2:
        failures.append(f"Expected 2-3 overdue ACTIVE allocations, found {overdue_count}")

    if failures:
        print("\n CONSISTENCY ASSERTION FAILURES:")
        for f in failures:
            print(f"  - {f}")
        raise SystemExit(1)

    print("\n[OK] All consistency assertions passed.")


# ─────────────────────────────────────────────────────────────────────────────
# Demo login table
# ─────────────────────────────────────────────────────────────────────────────


def print_demo_login_table(users: dict[str, User]):
    rows = [
        ("Admin", "admin@assetflow.io", DEMO_PASSWORD),
        ("Asset Manager", "asset.manager1@assetflow.io", DEMO_PASSWORD),
        ("Asset Manager", "asset.manager2@assetflow.io", DEMO_PASSWORD),
        ("Dept Head (Engineering)", "engineering.head@assetflow.io", DEMO_PASSWORD),
        ("Dept Head (Facilities)", "facilities.head@assetflow.io", DEMO_PASSWORD),
        ("Dept Head (Field Ops)", "field.ops.head@assetflow.io", DEMO_PASSWORD),
        ("Dept Head (Admin)", "admin.head@assetflow.io", DEMO_PASSWORD),
        ("Employee (holds AF-0114)", "priya.shah@assetflow.io", DEMO_PASSWORD),
        ("Employee (transfer target)", "arjun.nair@assetflow.io", DEMO_PASSWORD),
    ]
    print("\n" + "=" * 70)
    print("DEMO LOGIN TABLE")
    print("=" * 70)
    print(f"{'Role':<28} {'Email':<32} {'Password'}")
    print("-" * 70)
    for role, email, password in rows:
        print(f"{role:<28} {email:<32} {password}")
    print("=" * 70)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────


def seed():
    db = SessionLocal()
    try:
        if RESET:
            print("[SEED] --reset flag set: truncating all seeded tables...")
            truncate_all(db)

        depts = seed_departments(db)
        print(f"[SEED] Departments: {len(depts)}")

        cats = seed_categories(db)
        print(f"[SEED] Categories: {len(cats)}")

        users = seed_users(db, depts)
        print(f"[SEED] Users: {len(users)}")

        assets = seed_assets(db, cats)
        print(f"[SEED] Assets: {len(assets) - 1}")  # -1 for the internal __anchor_laptop__ alias if double-counted

        seed_allocations(db, assets, users, depts)
        print("[SEED] Allocations seeded")

        seed_transfers(db, assets, users)
        print("[SEED] Transfers seeded")

        seed_bookings(db, assets, users)
        print("[SEED] Bookings seeded")

        seed_maintenance(db, assets, users)
        print("[SEED] Maintenance requests seeded")

        seed_audit(db, assets, users, depts)
        print("[SEED] Audit cycles seeded")

        seed_notifications(db, assets, users)
        print("[SEED] Notifications seeded")

        seed_activity_logs(db, assets, users)
        print("[SEED] Activity logs seeded")

        run_consistency_assertions(db)
        print_demo_login_table(users)
        print("\n[SEED] Done.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
