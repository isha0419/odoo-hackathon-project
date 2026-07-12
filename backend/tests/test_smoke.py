"""
Smoke tests — verify the app boots and critical infra works.
These run first in CI to catch config / import / migration issues early.
"""

import pytest


@pytest.mark.unit
class TestAppBoot:
    """Verify the FastAPI application starts correctly."""

    def test_app_creates_successfully(self, client):
        """The app factory produces a working ASGI application."""
        assert client is not None

    def test_health_endpoint(self, client):
        """GET /api/health returns 200 — proves routing + DB are alive."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_docs_available(self, client):
        """Swagger UI is accessible (FastAPI default)."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_schema(self, client):
        """OpenAPI schema is generated — confirms all routers registered without import errors."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert schema["info"]["title"] == "AssetFlow"
