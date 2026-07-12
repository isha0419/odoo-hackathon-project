"""
AssetFlow — Auth service (signup, login, me, forgot-password).

Signup ALWAYS creates EMPLOYEE — role field in body is ignored.
Login returns JWT with claims {sub, role, department_id, exp}.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.enums import ActiveStatus, UserRole
from app.schemas.auth import SignupRequest, TokenResponse, UserOut
from app.security import create_access_token, hash_password, verify_password


def signup(db: Session, data: SignupRequest) -> User:
    """Create a new user with role=EMPLOYEE. Ignore any role in input."""
    # Check for duplicate email
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{data.email}' is already registered",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.EMPLOYEE,  # Always EMPLOYEE — frozen per design.md
        status=ActiveStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, email: str, password: str) -> TokenResponse:
    """Authenticate and return JWT + user profile."""
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != ActiveStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive",
        )

    token = create_access_token(
        sub=str(user.id),
        role=user.role.value,
        department_id=user.department_id,
    )

    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


def get_me(db: Session, user_id: uuid.UUID) -> User:
    """Return current user's profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def forgot_password(email: str) -> dict:
    """Stub — returns 200, sends nothing. Per design.md Section 8."""
    return {"message": "If that email exists, a reset link has been sent."}
