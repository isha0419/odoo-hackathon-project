"""AssetFlow — Audit item model (individual asset verification)."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import AuditVerification


class AuditItem(Base):
    __tablename__ = "audit_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    audit_cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )
    expected_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification: Mapped[AuditVerification] = mapped_column(
        default=AuditVerification.PENDING, server_default=AuditVerification.PENDING.value, nullable=False
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    audit_cycle = relationship("AuditCycle", back_populates="items")
    asset = relationship("Asset")
    verifier = relationship("User", foreign_keys=[verified_by])
