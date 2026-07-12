"""AssetFlow — Reports Service (Track D)."""

import csv
import io
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.booking import Booking
from app.models.department import Department
from app.models.enums import AllocationStatus, AssetCondition, BookingStatus
from app.models.maintenance_request import MaintenanceRequest
from app.schemas.reports import (
    DueReport,
    HeatmapBucket,
    IdleReport,
    MaintenanceFreqReport,
    MostUsedReport,
    UtilizationReport,
)

RETIREMENT_AGE_YEARS = 5


def get_utilization(db: Session, dept_id: uuid.UUID | None = None) -> list[UtilizationReport]:
    # Total assets in the company
    total_assets = db.scalar(select(func.count(Asset.id))) or 1

    # Allocated assets grouped by department
    stmt = (
        select(Department.id, Department.name, func.count(Allocation.id).label("allocated_count"))
        .select_from(Department)
        .join(Allocation, Allocation.holder_department_id == Department.id)
        .where(Allocation.status == AllocationStatus.ACTIVE)
        .group_by(Department.id)
    )

    if dept_id:
        stmt = stmt.where(Department.id == dept_id)

    results = db.execute(stmt).all()
    reports = []
    for row in results:
        reports.append(
            UtilizationReport(
                department_id=str(row.id),
                department_name=row.name,
                total_assets=total_assets,
                allocated_assets=row.allocated_count,
                utilization_ratio=round(row.allocated_count / total_assets, 2),
            )
        )
    return reports


def get_most_used(db: Session, dept_id: uuid.UUID | None = None) -> list[MostUsedReport]:
    # Simple heuristic: count of allocations per asset
    stmt = (
        select(Asset.id, Asset.asset_tag, Asset.name, func.count(Allocation.id).label("usage"))
        .join(Allocation, Allocation.asset_id == Asset.id)
        .group_by(Asset.id)
        .order_by(func.count(Allocation.id).desc())
        .limit(10)
    )

    if dept_id:
        stmt = stmt.where(Allocation.holder_department_id == dept_id)

    results = db.execute(stmt).all()
    return [
        MostUsedReport(asset_id=str(row.id), asset_tag=row.asset_tag, name=row.name, usage_count=row.usage)
        for row in results
    ]


def get_idle(db: Session, dept_id: uuid.UUID | None = None, min_days: int = 30) -> list[IdleReport]:
    # Assets with no active allocation, idle for at least min_days.
    # dept_id is not applied here: assets don't carry a department directly, only
    # via allocations, and an idle asset by definition has none active to scope by.
    stmt = select(Asset).where(~Asset.allocations.any(Allocation.status == AllocationStatus.ACTIVE))
    now = datetime.now(UTC)

    reports = []
    for asset in db.scalars(stmt).all():
        last_activity = asset.created_at
        for alloc in asset.allocations:
            if alloc.returned_at and alloc.returned_at > last_activity:
                last_activity = alloc.returned_at
        for booking in asset.bookings:
            booking_end = booking.time_range.upper if booking.time_range else None
            if booking_end and booking_end > last_activity:
                last_activity = booking_end

        days_idle = (now - last_activity).days
        if days_idle >= min_days:
            reports.append(
                IdleReport(asset_id=str(asset.id), asset_tag=asset.asset_tag, name=asset.name, days_idle=days_idle)
            )

    reports.sort(key=lambda r: r.days_idle, reverse=True)
    return reports[:20]


def get_maintenance_freq(db: Session, dept_id: uuid.UUID | None = None) -> list[MaintenanceFreqReport]:
    stmt = (
        select(AssetCategory.name, func.count(MaintenanceRequest.id).label("req_count"))
        .select_from(AssetCategory)
        .join(Asset, Asset.category_id == AssetCategory.id)
        .join(MaintenanceRequest, MaintenanceRequest.asset_id == Asset.id)
        .group_by(AssetCategory.id)
    )
    results = db.execute(stmt).all()
    return [MaintenanceFreqReport(category_name=row.name, request_count=row.req_count) for row in results]


def get_due(db: Session, dept_id: uuid.UUID | None = None) -> list[DueReport]:
    # "Due" per design.md: due for maintenance (poor/fair condition) OR nearing retirement
    # (old by acquisition date — there's no scheduled-maintenance/retirement-date field
    # to check against, so condition and age are the closest real signals available).
    reports: list[DueReport] = []
    seen_ids: set[uuid.UUID] = set()

    poor_condition = db.scalars(
        select(Asset).where(Asset.condition.in_([AssetCondition.POOR, AssetCondition.FAIR])).limit(20)
    ).all()
    for asset in poor_condition:
        reports.append(
            DueReport(
                asset_id=str(asset.id),
                asset_tag=asset.asset_tag,
                name=asset.name,
                reason=f"Condition is {asset.condition.value} — due for maintenance",
            )
        )
        seen_ids.add(asset.id)

    retirement_cutoff = date.today().replace(year=date.today().year - RETIREMENT_AGE_YEARS)
    aging_assets = db.scalars(
        select(Asset).where(Asset.acquisition_date.isnot(None), Asset.acquisition_date <= retirement_cutoff).limit(20)
    ).all()
    for asset in aging_assets:
        if asset.id in seen_ids:
            continue
        years = (date.today() - asset.acquisition_date).days // 365
        reports.append(
            DueReport(
                asset_id=str(asset.id),
                asset_tag=asset.asset_tag,
                name=asset.name,
                reason=f"Acquired {years} years ago — nearing retirement",
            )
        )

    return reports[:20]


def get_booking_heatmap(db: Session, dept_id: uuid.UUID | None = None) -> list[HeatmapBucket]:
    # Postgres EXTRACT(DOW ...) returns 0=Sunday..6=Saturday; HeatmapBucket documents
    # 0=Monday..6=Sunday, so convert. Cancelled bookings shouldn't count toward usage.
    stmt = (
        select(
            func.extract("dow", func.lower(Booking.time_range)).label("dow"),
            func.extract("hour", func.lower(Booking.time_range)).label("hour"),
            func.count(Booking.id).label("count"),
        )
        .where(Booking.status != BookingStatus.CANCELLED)
        .group_by("dow", "hour")
    )

    if dept_id:
        stmt = stmt.where(Booking.department_id == dept_id)

    results = db.execute(stmt).all()
    counts: dict[int, dict[int, int]] = {}
    for row in results:
        iso_dow = (int(row.dow) + 6) % 7
        counts.setdefault(iso_dow, {})[int(row.hour)] = row.count

    return [
        HeatmapBucket(day_of_week=dow, hour_of_day=hour, count=counts.get(dow, {}).get(hour, 0))
        for dow in range(7)
        for hour in range(24)
    ]


def export_csv(db: Session, report: str, dept_id: uuid.UUID | None = None) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    if report == "utilization":
        data = get_utilization(db, dept_id)
        writer.writerow(["Department", "Total Assets", "Allocated", "Ratio"])
        for d in data:
            writer.writerow([d.department_name, d.total_assets, d.allocated_assets, d.utilization_ratio])
    elif report == "most-used":
        data = get_most_used(db, dept_id)
        writer.writerow(["Asset Tag", "Name", "Usage Count"])
        for d in data:
            writer.writerow([d.asset_tag, d.name, d.usage_count])
    elif report == "idle":
        data = get_idle(db, dept_id)
        writer.writerow(["Asset Tag", "Name", "Days Idle"])
        for d in data:
            writer.writerow([d.asset_tag, d.name, d.days_idle])
    elif report == "maintenance-frequency":
        data = get_maintenance_freq(db, dept_id)
        writer.writerow(["Category", "Request Count"])
        for d in data:
            writer.writerow([d.category_name, d.request_count])
    elif report == "due":
        data = get_due(db, dept_id)
        writer.writerow(["Asset Tag", "Name", "Reason"])
        for d in data:
            writer.writerow([d.asset_tag, d.name, d.reason])
    elif report == "booking-heatmap":
        data = get_booking_heatmap(db, dept_id)
        writer.writerow(["Day of Week", "Hour", "Count"])
        for d in data:
            writer.writerow([d.day_of_week, d.hour_of_day, d.count])
    else:
        writer.writerow(["Unsupported Report"])

    return output.getvalue()
