"""AssetFlow — Audit cycle model."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import AuditCycleStatus


class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(Text, nullable=False)
    scope_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    scope_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AuditCycleStatus] = mapped_column(
        default=AuditCycleStatus.OPEN, server_default=AuditCycleStatus.OPEN.value, nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    scope_department = relationship("Department", foreign_keys=[scope_department_id])
    auditors = relationship("AuditCycleAuditor", back_populates="audit_cycle")
    items = relationship("AuditItem", back_populates="audit_cycle")
