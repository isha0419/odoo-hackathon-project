"""
AssetFlow — App factory and router registration.

This is the ONE shared write point. Keep it to app.include_router(...) lines
only, one per module, alphabetized, so merges are trivial.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import engine, Base  # noqa: F401 — ensure models are importable


def create_app() -> FastAPI:
    """Application factory."""
    application = FastAPI(
        title="AssetFlow",
        description="Enterprise Asset & Resource Management System",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS (permissive for dev/hackathon) ───────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health check (used by CI & Docker healthcheck) ────────────────────
    @application.get("/api/health", tags=["infra"])
    def health():
        return {"status": "healthy"}

    # ── Router registration (alphabetized, one per module) ────────────────
    # app.include_router(allocation_router, prefix="/api")
    # app.include_router(assets_router, prefix="/api")
    # app.include_router(audit_router, prefix="/api")
    # app.include_router(auth_router, prefix="/api")
    # app.include_router(booking_router, prefix="/api")
    # app.include_router(dashboard_router, prefix="/api")
    # app.include_router(maintenance_router, prefix="/api")
    # app.include_router(notifications_router, prefix="/api")
    # app.include_router(org_router, prefix="/api")
    # app.include_router(reports_router, prefix="/api")

    return application


app = create_app()
