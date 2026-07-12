"""AssetFlow — Notifications router (list, mark-read)."""

from fastapi import APIRouter

router = APIRouter(prefix="/notifications", tags=["notifications"])
