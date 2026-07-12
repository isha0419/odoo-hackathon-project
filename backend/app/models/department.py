"""AssetFlow — Department model with hierarchy (self-referencing)."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import ActiveStatus


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    head_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    parent_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    status: Mapped[ActiveStatus] = mapped_column(
        default=ActiveStatus.ACTIVE, server_default=ActiveStatus.ACTIVE.value, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    head = relationship("User", foreign_keys=[head_user_id])
    parent = relationship("Department", remote_side=[id], foreign_keys=[parent_department_id])
    members = relationship("User", foreign_keys="[User.department_id]", back_populates="department")
