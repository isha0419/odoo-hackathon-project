"""
AssetFlow — FastAPI dependencies for auth & authorization.

get_current_user  → decodes JWT, loads user, 401 on failure/inactive
require_role      → 403 unless current_user.role in allowed roles
require_same_department → 403 if dept mismatch (for Dept Head scoping)
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.enums import ActiveStatus, UserRole
from app.models.user import User
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT, fetch user from DB, reject if inactive."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as e:
        raise credentials_exception from e

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None or user.status != ActiveStatus.ACTIVE:
        raise credentials_exception
    return user


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory: returns a dependency that checks the current user's role.
    Usage: `Depends(require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER))`
    """

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role.value}' not allowed. Required: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return _check


def require_same_department(department_id: uuid.UUID):
    """
    Dependency factory: 403 if a DEPARTMENT_HEAD is accessing resources outside
    their department. ADMIN / ASSET_MANAGER bypass this check.
    """

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        check_department_scope(current_user, department_id)
        return current_user

    return _check


def check_department_scope(current_user: User, department_id: uuid.UUID | None):
    """
    Synchronous helper to enforce department isolation for DEPARTMENT_HEAD role.
    Raises 403 if they attempt to act on another department's resources.
    """
    if current_user.role in (UserRole.ADMIN, UserRole.ASSET_MANAGER):
        return
    if current_user.role == UserRole.DEPARTMENT_HEAD and (
        department_id is None or current_user.department_id != department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to own department",
        )
