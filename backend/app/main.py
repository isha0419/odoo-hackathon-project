"""
AssetFlow — App factory and router registration.

This is the ONE shared write point. Keep it to app.include_router(...) lines
only, one per module, alphabetized, so merges are trivial.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models


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
    from app.routers.activity_logs import router as activity_logs_router
    from app.routers.allocation import router as allocation_router
    from app.routers.assets import router as assets_router
    from app.routers.audit import audit_items_router
    from app.routers.audit import router as audit_router
    from app.routers.auth import router as auth_router
    from app.routers.booking import router as booking_router
    from app.routers.dashboard import router as dashboard_router
    from app.routers.maintenance import router as maintenance_router
    from app.routers.notifications import router as notifications_router
    from app.routers.org import router as org_router
    from app.routers.reports import router as reports_router
    from app.routers.transfers import router as transfers_router

    application.include_router(activity_logs_router, prefix="/api")
    application.include_router(allocation_router, prefix="/api")
    application.include_router(assets_router, prefix="/api")
    application.include_router(audit_router, prefix="/api")
    application.include_router(audit_items_router, prefix="/api")
    application.include_router(auth_router, prefix="/api")
    application.include_router(booking_router, prefix="/api")
    application.include_router(dashboard_router, prefix="/api")
    application.include_router(maintenance_router, prefix="/api")
    application.include_router(notifications_router, prefix="/api")
    application.include_router(org_router, prefix="/api")
    application.include_router(reports_router, prefix="/api")
    application.include_router(transfers_router, prefix="/api")

    return application


app = create_app()
