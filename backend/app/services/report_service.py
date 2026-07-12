"""AssetFlow — Reports Service (Track D)."""

import csv
import io
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.booking import Booking
from app.models.department import Department
from app.models.enums import AllocationStatus, AssetCondition
from app.models.maintenance_request import MaintenanceRequest
from app.schemas.reports import (
    DueReport,
    HeatmapBucket,
    IdleReport,
    MaintenanceFreqReport,
    MostUsedReport,
    UtilizationReport,
)


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


def get_idle(db: Session, dept_id: uuid.UUID | None = None) -> list[IdleReport]:
    # Assets with no active allocations
    stmt = select(Asset).options(
        joinedload(Asset.allocations),
        joinedload(Asset.bookings)
    ).where(~Asset.allocations.any(Allocation.status == AllocationStatus.ACTIVE)).limit(20)

    results = db.scalars(stmt).unique().all()
    from datetime import date
    today = date.today()
    reports = []

    for a in results:
        last_date = a.created_at.date() if a.created_at else today

        if a.allocations:
            alloc_dates = [alloc.returned_at.date() for alloc in a.allocations if alloc.returned_at]
            if alloc_dates:
                last_date = max(last_date, max(alloc_dates))

        if a.bookings:
            booking_dates = [b.time_range.upper.date() for b in a.bookings if b.time_range and b.time_range.upper]
            if booking_dates:
                last_date = max(last_date, max(booking_dates))

        days_idle = max(0, (today - last_date).days)

        reports.append(
            IdleReport(
                asset_id=str(a.id),
                asset_tag=a.asset_tag,
                name=a.name,
                days_idle=days_idle,
            )
        )
    return reports


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
    # Due: condition == POOR or FAIR
    stmt = select(Asset).where(Asset.condition.in_([AssetCondition.POOR, AssetCondition.FAIR])).limit(20)

    results = db.scalars(stmt).all()
    return [
        DueReport(asset_id=str(a.id), asset_tag=a.asset_tag, name=a.name, reason=f"Condition is {a.condition.value}")
        for a in results
    ]


def get_booking_heatmap(db: Session, dept_id: uuid.UUID | None = None) -> list[HeatmapBucket]:
    # Postgres extraction: EXTRACT(DOW FROM lower(time_range))
    stmt = select(
        func.extract("dow", func.lower(Booking.time_range)).label("dow"),
        func.extract("hour", func.lower(Booking.time_range)).label("hour"),
        func.count(Booking.id).label("count"),
    ).group_by("dow", "hour")

    if dept_id:
        stmt = stmt.where(Booking.department_id == dept_id)

    results = db.execute(stmt).all()
    return [HeatmapBucket(day_of_week=int(row.dow), hour_of_day=int(row.hour), count=row.count) for row in results]


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
        writer.writerow(["Day of Week", "Hour of Day", "Count"])
        for d in data:
            writer.writerow([d.day_of_week, d.hour_of_day, d.count])
    else:
        writer.writerow(["Unsupported Report"])

    return output.getvalue()
