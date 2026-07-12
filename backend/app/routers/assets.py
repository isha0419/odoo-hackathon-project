"""AssetFlow — Assets router (register, search, detail, update)."""

from fastapi import APIRouter

router = APIRouter(prefix="/assets", tags=["assets"])
