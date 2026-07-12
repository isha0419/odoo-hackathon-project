"""AssetFlow — Maintenance router (raise, transition, kanban list)."""

from fastapi import APIRouter

router = APIRouter(prefix="/maintenance", tags=["maintenance"])
