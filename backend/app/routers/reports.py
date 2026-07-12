"""AssetFlow — Reports Router."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.reports import (
    DueReport,
    HeatmapBucket,
    IdleReport,
    MaintenanceFreqReport,
    MostUsedReport,
    UtilizationReport,
)
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_dept_id(current_user: User, dept_id: Optional[uuid.UUID]) -> Optional[uuid.UUID]:
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        return current_user.department_id
    return dept_id


@router.get("/utilization", response_model=List[UtilizationReport])
def get_utilization(
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    return report_service.get_utilization(db, dept_id)


@router.get("/most-used", response_model=List[MostUsedReport])
def get_most_used(
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    return report_service.get_most_used(db, dept_id)


@router.get("/idle", response_model=List[IdleReport])
def get_idle(
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    return report_service.get_idle(db, dept_id)


@router.get("/maintenance-frequency", response_model=List[MaintenanceFreqReport])
def get_maintenance_freq(
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    return report_service.get_maintenance_freq(db, dept_id)


@router.get("/due", response_model=List[DueReport])
def get_due(
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    return report_service.get_due(db, dept_id)


@router.get("/booking-heatmap", response_model=List[HeatmapBucket])
def get_booking_heatmap(
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    return report_service.get_booking_heatmap(db, dept_id)


@router.get("/export", response_class=PlainTextResponse)
def export_report(
    report: str,
    department_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
):
    dept_id = _get_dept_id(current_user, department_id)
    csv_data = report_service.export_csv(db, report, dept_id)
    
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report}.csv"}
    )
