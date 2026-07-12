"""AssetFlow — Transfer requests router."""

from fastapi import APIRouter

router = APIRouter(prefix="/transfers", tags=["transfers"])
