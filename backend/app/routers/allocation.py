"""AssetFlow — Allocation router (allocate, return, list)."""

from fastapi import APIRouter

router = APIRouter(prefix="/allocations", tags=["allocations"])
