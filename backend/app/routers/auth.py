"""
AssetFlow — Auth router (signup, login, forgot-password, me).

All public except /me which requires a valid JWT.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account. Role is always EMPLOYEE."""
    user = auth_service.signup(db, data)
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive a JWT access token."""
    return auth_service.login(db, data.email, data.password)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    """Stub — returns 200, sends nothing."""
    return auth_service.forgot_password(data.email)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return UserOut.model_validate(current_user)
