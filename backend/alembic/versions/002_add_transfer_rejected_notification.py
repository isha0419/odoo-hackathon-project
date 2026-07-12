"""Add TRANSFER_REJECTED to notification_type enum.

design.md Section 3.1 only lists TRANSFER_APPROVED for transfers (no REJECTED
counterpart, unlike MAINTENANCE_APPROVED/MAINTENANCE_REJECTED). transfer_service.py
needs a distinct type to notify requesters on rejection; this migration adds the
missing enum value rather than silently reusing an unrelated one. Flagging this
as a spec gap per team_workflow.txt's "flag ambiguity, don't silently resolve" rule.

Revision ID: 002_add_transfer_rejected
Revises: 001_initial_schema
Create Date: 2026-07-12
"""

from collections.abc import Sequence

from alembic import op

revision: str = "002_add_transfer_rejected"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TRANSFER_REJECTED'")


def downgrade() -> None:
    # Postgres does not support removing a value from an enum type.
    pass
