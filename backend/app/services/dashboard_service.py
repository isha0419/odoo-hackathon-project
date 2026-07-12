"""AssetFlow — Dashboard Service (Track D)."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.booking import Booking
from app.models.enums import (
    AllocationStatus,
    AssetStatus,
    BookingStatus,
    MaintenanceStatus,
    TransferStatus,
)
from app.models.maintenance_request import MaintenanceRequest
from app.models.transfer_request import TransferRequest
from app.models.user import User
from app.schemas.dashboard import DashboardKPIs
from app.services import notifications_service


def get_dashboard_kpis(db: Session, user: User) -> DashboardKPIs:
    # Sync derived notifications first (OVERDUE_RETURN, BOOKING_REMINDER)
    notifications_service.sync_derived(db)

    # Scoping logic
    is_global = user.role.value in ("ADMIN", "ASSET_MANAGER")
    is_head = user.role.value == "DEPARTMENT_HEAD"
    dept_id = user.department_id

    today = date.today()
    now = datetime.now(UTC)

    # 1. Assets Available & Allocated (Global)
    assets_available = db.scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.AVAILABLE)) or 0
    assets_allocated = db.scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.ALLOCATED)) or 0

    # 2. Maintenance Today
    maint_stmt = select(func.count(MaintenanceRequest.id)).where(
        (func.date(MaintenanceRequest.created_at) == today)
        | (MaintenanceRequest.status == MaintenanceStatus.IN_PROGRESS)
        | (MaintenanceRequest.status == MaintenanceStatus.APPROVED)
    )
    if not is_global:
        maint_stmt = maint_stmt.where(MaintenanceRequest.raised_by == user.id)
    maintenance_today = db.scalar(maint_stmt) or 0

    # 3. Active Bookings
    # In PostgreSQL, we can check if now is contained in time_range with @>
    # or just fetch and filter in memory if complex, but @> works for TSTZRANGE.
    booking_stmt = select(func.count(Booking.id)).where(
        Booking.status == BookingStatus.UPCOMING, Booking.time_range.op("@>")(now)
    )
    if not is_global:
        if is_head and dept_id:
            booking_stmt = booking_stmt.where(Booking.department_id == dept_id)
        else:
            booking_stmt = booking_stmt.where(Booking.booked_by_user_id == user.id)
    active_bookings = db.scalar(booking_stmt) or 0

    # 4. Pending Transfers
    transf_stmt = select(func.count(TransferRequest.id)).where(TransferRequest.status == TransferStatus.REQUESTED)
    if not is_global:
        transf_stmt = transf_stmt.where(
            (TransferRequest.from_user_id == user.id) | (TransferRequest.to_user_id == user.id)
        )
    pending_transfers = db.scalar(transf_stmt) or 0

    # 5. Upcoming & Overdue Returns
    alloc_stmt = select(Allocation).where(
        Allocation.status == AllocationStatus.ACTIVE, Allocation.expected_return_date.isnot(None)
    )
    if not is_global:
        if is_head and dept_id:
            alloc_stmt = alloc_stmt.where(Allocation.holder_department_id == dept_id)
        else:
            alloc_stmt = alloc_stmt.where(Allocation.holder_user_id == user.id)

    allocations = db.scalars(alloc_stmt).all()

    upcoming_returns = []
    overdue_returns = []
    seven_days = today + timedelta(days=7)

    for alloc in allocations:
        if alloc.expected_return_date:
            if alloc.expected_return_date < today:
                overdue_returns.append(alloc)
            elif alloc.expected_return_date <= seven_days:
                upcoming_returns.append(alloc)

    # 6. Recent Activity
    act_stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10)
    if not is_global:
        act_stmt = act_stmt.where(ActivityLog.actor_user_id == user.id)

    recent_activity = db.scalars(act_stmt).all()

    return DashboardKPIs(
        assets_available=assets_available,
        assets_allocated=assets_allocated,
        maintenance_today=maintenance_today,
        active_bookings=active_bookings,
        pending_transfers=pending_transfers,
        upcoming_returns=upcoming_returns,
        overdue_returns=overdue_returns,
        recent_activity=recent_activity,
    )
