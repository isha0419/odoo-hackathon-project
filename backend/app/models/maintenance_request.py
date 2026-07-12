"""AssetFlow — Maintenance request model with kanban status."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import MaintenancePriority, MaintenanceStatus


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False
    )
    raised_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[MaintenancePriority] = mapped_column(
        default=MaintenancePriority.MEDIUM, server_default=MaintenancePriority.MEDIUM.value, nullable=False
    )
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[MaintenanceStatus] = mapped_column(
        default=MaintenanceStatus.PENDING, server_default=MaintenanceStatus.PENDING.value, nullable=False
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    technician_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_requests")
    raiser = relationship("User", foreign_keys=[raised_by])
    approver = relationship("User", foreign_keys=[approved_by])
