"""Initial schema — all tables, enums, constraints, and sequences.

Revision ID: 001_initial_schema
Revises: None
Create Date: 2026-07-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSTZRANGE, ENUM

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ── Enum type names & values (frozen per design.md Section 3.1) ───────────
ENUMS = {
    "user_role": ("ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"),
    "active_status": ("ACTIVE", "INACTIVE"),
    "asset_status": ("AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "RETIRED", "DISPOSED"),
    "asset_condition": ("NEW", "GOOD", "FAIR", "POOR"),
    "allocation_status": ("ACTIVE", "RETURNED"),
    "transfer_status": ("REQUESTED", "APPROVED", "REJECTED", "COMPLETED"),
    "booking_status": ("UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"),
    "maintenance_status": ("PENDING", "APPROVED", "REJECTED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "RESOLVED"),
    "maintenance_priority": ("LOW", "MEDIUM", "HIGH", "CRITICAL"),
    "audit_cycle_status": ("OPEN", "CLOSED"),
    "audit_verification": ("PENDING", "VERIFIED", "MISSING", "DAMAGED"),
    "notification_type": (
        "ASSET_ASSIGNED", "MAINTENANCE_APPROVED", "MAINTENANCE_REJECTED",
        "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "BOOKING_REMINDER",
        "TRANSFER_APPROVED", "OVERDUE_RETURN", "AUDIT_DISCREPANCY",
    ),
}

# Pre-build ENUM type objects (create_type=False — we create them manually)
_e = {name: ENUM(*vals, name=name, create_type=False) for name, vals in ENUMS.items()}


def upgrade() -> None:
    # ── Extensions ────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    # ── Enum types ────────────────────────────────────────────────────────
    for name, values in ENUMS.items():
        val_list = ", ".join(f"'{v}'" for v in values)
        op.execute(f"CREATE TYPE {name} AS ENUM ({val_list})")

    # ── Asset tag sequence ────────────────────────────────────────────────
    op.execute("CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START 1")

    # ── Tables (FK-dependency order) ──────────────────────────────────────

    # 1. departments (self-ref, users FK added later)
    op.create_table(
        "departments",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False, unique=True),
        sa.Column("head_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("parent_department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("status", _e["active_status"], nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 2. users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", _e["user_role"], nullable=False, server_default="EMPLOYEE"),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("status", _e["active_status"], nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Add FK from departments.head_user_id → users.id
    op.create_foreign_key("fk_departments_head_user", "departments", "users", ["head_user_id"], ["id"])

    # 3. asset_categories
    op.create_table(
        "asset_categories",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False, unique=True),
        sa.Column("custom_fields", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 4. assets
    op.create_table(
        "assets",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("asset_tag", sa.Text(), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("asset_categories.id"), nullable=False),
        sa.Column("serial_number", sa.Text(), nullable=True, unique=True),
        sa.Column("acquisition_date", sa.Date(), nullable=True),
        sa.Column("acquisition_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("condition", _e["asset_condition"], nullable=False, server_default="GOOD"),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("is_bookable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("custom_values", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", _e["asset_status"], nullable=False, server_default="AVAILABLE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 5. allocations
    op.create_table(
        "allocations",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("asset_id", UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("holder_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("holder_department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("allocated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("allocated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expected_return_date", sa.Date(), nullable=True),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("return_condition_notes", sa.Text(), nullable=True),
        sa.Column("status", _e["allocation_status"], nullable=False, server_default="ACTIVE"),
    )

    # ── Crown Jewel #1: partial unique index ──────────────────────────────
    op.execute(
        "CREATE UNIQUE INDEX one_active_allocation_per_asset "
        "ON allocations (asset_id) WHERE returned_at IS NULL"
    )

    # 6. transfer_requests
    op.create_table(
        "transfer_requests",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("asset_id", UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("from_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("to_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("requested_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", _e["transfer_status"], nullable=False, server_default="REQUESTED"),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 7. bookings
    op.create_table(
        "bookings",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("asset_id", UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("booked_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("time_range", TSTZRANGE, nullable=False),
        sa.Column("status", _e["booking_status"], nullable=False, server_default="UPCOMING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ── Crown Jewel #2: exclusion constraint ──────────────────────────────
    op.execute(
        "ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings "
        "EXCLUDE USING gist (asset_id WITH =, time_range WITH &&) "
        "WHERE (status <> 'CANCELLED')"
    )

    # 8. maintenance_requests
    op.create_table(
        "maintenance_requests",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("asset_id", UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("raised_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("issue_description", sa.Text(), nullable=False),
        sa.Column("priority", _e["maintenance_priority"], nullable=False, server_default="MEDIUM"),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("status", _e["maintenance_status"], nullable=False, server_default="PENDING"),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("technician_name", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 9. audit_cycles
    op.create_table(
        "audit_cycles",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("scope_department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("scope_location", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", _e["audit_cycle_status"], nullable=False, server_default="OPEN"),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 10. audit_cycle_auditors (join table)
    op.create_table(
        "audit_cycle_auditors",
        sa.Column("audit_cycle_id", UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id"), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True),
    )

    # 11. audit_items
    op.create_table(
        "audit_items",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("audit_cycle_id", UUID(as_uuid=True), sa.ForeignKey("audit_cycles.id"), nullable=False),
        sa.Column("asset_id", UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("expected_location", sa.Text(), nullable=True),
        sa.Column("verification", _e["audit_verification"], nullable=False, server_default="PENDING"),
        sa.Column("verified_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # 12. notifications
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("recipient_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("type", _e["notification_type"], nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 13. activity_logs
    op.create_table(
        "activity_logs",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("actor_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    # Drop tables in reverse FK-dependency order
    op.drop_table("activity_logs")
    op.drop_table("notifications")
    op.drop_table("audit_items")
    op.drop_table("audit_cycle_auditors")
    op.drop_table("audit_cycles")
    op.drop_table("maintenance_requests")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings")
    op.drop_table("bookings")
    op.drop_table("transfer_requests")
    op.execute("DROP INDEX IF EXISTS one_active_allocation_per_asset")
    op.drop_table("allocations")
    op.drop_table("assets")
    op.drop_table("asset_categories")
    op.drop_table("users")
    op.drop_constraint("fk_departments_head_user", "departments", type_="foreignkey")
    op.drop_table("departments")

    # Drop sequence
    op.execute("DROP SEQUENCE IF EXISTS asset_tag_seq")

    # Drop enum types
    for name in reversed(list(ENUMS.keys())):
        op.execute(f"DROP TYPE IF EXISTS {name}")

    # Drop extensions
    op.execute("DROP EXTENSION IF EXISTS citext")
    op.execute("DROP EXTENSION IF EXISTS btree_gist")
    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
