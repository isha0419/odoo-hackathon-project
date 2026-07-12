"""AssetFlow — Asset model with lifecycle status and bookable flag."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import AssetCondition, AssetStatus


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    asset_tag: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=False
    )
    serial_number: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    acquisition_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    acquisition_cost: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    condition: Mapped[AssetCondition] = mapped_column(
        default=AssetCondition.GOOD, server_default=AssetCondition.GOOD.value, nullable=False
    )
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_bookable: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    custom_values: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    status: Mapped[AssetStatus] = mapped_column(
        default=AssetStatus.AVAILABLE, server_default=AssetStatus.AVAILABLE.value, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    category = relationship("AssetCategory")
    allocations = relationship("Allocation", back_populates="asset")
    bookings = relationship("Booking", back_populates="asset")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="asset")
