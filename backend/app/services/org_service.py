"""
AssetFlow — Organization service (departments, categories, employees).

Employee PATCH is the ONLY path where user roles change.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset_category import AssetCategory
from app.models.department import Department
from app.models.enums import ActiveStatus, UserRole
from app.models.user import User
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
from app.services import activity_service

# ═══════════════════════════════════════════════════════════════════════════════
# DEPARTMENTS
# ═══════════════════════════════════════════════════════════════════════════════


def list_departments(db: Session) -> list[DepartmentOut]:
    """List all departments with head and parent names."""
    depts = db.query(Department).order_by(Department.name).all()
    results = []
    for d in depts:
        results.append(_dept_to_out(d))
    return results


def create_department(db: Session, data: DepartmentCreate) -> DepartmentOut:
    """Create a new department. Name must be unique."""
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Department '{data.name}' already exists")

    dept = Department(
        name=data.name,
        head_user_id=data.head_user_id,
        parent_department_id=data.parent_department_id,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _dept_to_out(dept)


def update_department(db: Session, dept_id: uuid.UUID, data: DepartmentUpdate) -> DepartmentOut:
    """Update department fields."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if data.name is not None:
        # Check unique
        dup = db.query(Department).filter(Department.name == data.name, Department.id != dept_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Department '{data.name}' already exists")
        dept.name = data.name
    if data.head_user_id is not None:
        dept.head_user_id = data.head_user_id
    if data.parent_department_id is not None:
        dept.parent_department_id = data.parent_department_id
    if data.status is not None:
        dept.status = data.status

    db.commit()
    db.refresh(dept)
    return _dept_to_out(dept)


def delete_department(db: Session, dept_id: uuid.UUID) -> DepartmentOut:
    """Deactivate a department (soft delete)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    dept.status = ActiveStatus.INACTIVE
    db.commit()
    db.refresh(dept)
    return _dept_to_out(dept)


def _dept_to_out(dept: Department) -> DepartmentOut:
    """Convert Department model to DepartmentOut with head/parent names."""
    return DepartmentOut(
        id=dept.id,
        name=dept.name,
        head_user_id=dept.head_user_id,
        head_name=dept.head.name if dept.head else None,
        parent_department_id=dept.parent_department_id,
        parent_name=dept.parent.name if dept.parent else None,
        status=dept.status,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════


def list_categories(db: Session) -> list[CategoryOut]:
    """List all asset categories."""
    cats = db.query(AssetCategory).order_by(AssetCategory.name).all()
    return [CategoryOut.model_validate(c) for c in cats]


def create_category(db: Session, data: CategoryCreate) -> CategoryOut:
    """Create a new asset category. Name must be unique."""
    existing = db.query(AssetCategory).filter(AssetCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Category '{data.name}' already exists")

    cat = AssetCategory(name=data.name, custom_fields=data.custom_fields)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


def update_category(db: Session, cat_id: uuid.UUID, data: CategoryUpdate) -> CategoryOut:
    """Update an asset category."""
    cat = db.query(AssetCategory).filter(AssetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if data.name is not None:
        dup = db.query(AssetCategory).filter(AssetCategory.name == data.name, AssetCategory.id != cat_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Category '{data.name}' already exists")
        cat.name = data.name
    if data.custom_fields is not None:
        cat.custom_fields = data.custom_fields

    db.commit()
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEES
# ═══════════════════════════════════════════════════════════════════════════════


def list_employees(
    db: Session,
    current_user: User,
    limit: int = 50,
    offset: int = 0,
) -> list[EmployeeOut]:
    """
    List employees. Department heads see only their own department.
    Admin / Asset Manager see all.
    """
    query = db.query(User)

    if current_user.role == UserRole.DEPARTMENT_HEAD:
        query = query.filter(User.department_id == current_user.department_id)

    employees = query.order_by(User.name).offset(offset).limit(limit).all()
    return [_employee_to_out(e) for e in employees]


def update_employee(
    db: Session,
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    actor: User,
) -> EmployeeOut:
    """
    Admin-only: update role, department_id, status.
    This is the ONLY place roles change — per design.md Section 8.
    """
    emp = db.query(User).filter(User.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    old_role = emp.role

    if data.role is not None:
        emp.role = data.role
    if data.department_id is not None:
        emp.department_id = data.department_id
    if data.status is not None:
        emp.status = data.status

    db.commit()
    db.refresh(emp)

    # Log role changes
    if data.role is not None and data.role != old_role:
        activity_service.log(
            db=db,
            actor_id=actor.id,
            action="user.role_changed",
            entity_type="user",
            entity_id=emp.id,
            metadata={"old_role": old_role.value, "new_role": emp.role.value},
        )
        db.commit()

    return _employee_to_out(emp)


def _employee_to_out(user: User) -> EmployeeOut:
    """Convert User model to EmployeeOut with department name."""
    return EmployeeOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
