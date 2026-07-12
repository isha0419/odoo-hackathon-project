"""AssetFlow — Activity logs router."""

from fastapi import APIRouter

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])
