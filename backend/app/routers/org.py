"""
AssetFlow — Organization setup router (departments, categories, employees).

Guards enforced per Section 8.1 permission matrix.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.org import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    EmployeeOut,
    EmployeeUpdate,
)
from app.services import org_service

router = APIRouter(tags=["organization"])

# ── Departments ───────────────────────────────────────────────────────────────


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
    db: Session = Depends(get_db),
):
    """List all departments (mgr+ access)."""
    return org_service.list_departments(db)


@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new department (admin only)."""
    return org_service.create_department(db, data)


@router.patch("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: uuid.UUID,
    data: DepartmentUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Update a department (admin only)."""
    return org_service.update_department(db, dept_id, data)


@router.delete("/departments/{dept_id}", response_model=DepartmentOut)
def delete_department(
    dept_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Deactivate a department — soft delete (admin only)."""
    return org_service.delete_department(db, dept_id)


# ── Categories ────────────────────────────────────────────────────────────────


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
    db: Session = Depends(get_db),
):
    """List all asset categories (mgr+ access)."""
    return org_service.list_categories(db)


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Create an asset category (admin only)."""
    return org_service.create_category(db, data)


@router.patch("/categories/{cat_id}", response_model=CategoryOut)
def update_category(
    cat_id: uuid.UUID,
    data: CategoryUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Update an asset category (admin only)."""
    return org_service.update_category(db, cat_id, data)


# ── Employees ─────────────────────────────────────────────────────────────────


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)
    ),
    db: Session = Depends(get_db),
):
    """List employees. Dept Head sees own dept only."""
    return org_service.list_employees(db, current_user, limit=limit, offset=offset)


@router.patch("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin-only: set role, department_id, status. The ONLY place roles change."""
    return org_service.update_employee(db, employee_id, data, actor=current_user)
