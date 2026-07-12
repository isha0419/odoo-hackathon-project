"""AssetFlow — Allocation model (Crown Jewel #1 enforcement at DB level)."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Text, func, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import AllocationStatus


class Allocation(Base):
    __tablename__ = "allocations"
    __table_args__ = (
        Index(
            "one_active_allocation_per_asset",
            "asset_id",
            unique=True,
            postgresql_where=text("returned_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )
    holder_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    holder_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    allocated_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    allocated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    expected_return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(nullable=True)
    return_condition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[AllocationStatus] = mapped_column(
        default=AllocationStatus.ACTIVE, server_default=AllocationStatus.ACTIVE.value, nullable=False
    )

    # Relationships
    asset = relationship("Asset", back_populates="allocations")
    holder = relationship("User", foreign_keys=[holder_user_id])
    holder_department = relationship("Department", foreign_keys=[holder_department_id])
    allocator = relationship("User", foreign_keys=[allocated_by])
