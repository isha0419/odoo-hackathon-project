"""AssetFlow — Audit cycle ↔ auditor join table."""

import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class AuditCycleAuditor(Base):
    __tablename__ = "audit_cycle_auditors"

    audit_cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True
    )

    # Relationships
    audit_cycle = relationship("AuditCycle", back_populates="auditors")
    user = relationship("User")
