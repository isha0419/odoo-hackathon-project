"""AssetFlow — Auth schemas (Pydantic v2)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import ActiveStatus, UserRole


class SignupRequest(BaseModel):
    """Signup — NO role field; always creates EMPLOYEE."""

    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class UserOut(BaseModel):
    """Public user representation."""

    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    department_id: uuid.UUID | None = None
    status: ActiveStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
