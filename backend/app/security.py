"""
AssetFlow — Password hashing & JWT encode/decode.

Uses bcrypt directly (passlib has compatibility issues with newer bcrypt)
and python-jose for JWT.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(
    sub: str,
    role: str,
    department_id: str | None = None,
    expires_hours: int | None = None,
) -> str:
    """Create a JWT access token with standard claims."""
    expire = datetime.now(timezone.utc) + timedelta(
        hours=expires_hours or settings.jwt_expire_hours
    )
    payload = {
        "sub": sub,
        "role": role,
        "department_id": str(department_id) if department_id else None,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token. Raises JWTError on failure."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise
