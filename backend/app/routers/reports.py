"""AssetFlow — Reports router (utilization, most-used, idle, heatmap, CSV)."""

from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["reports"])
