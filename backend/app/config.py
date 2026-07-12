"""
AssetFlow — Application settings loaded from environment variables.

All config is read from env (or .env via pydantic-settings) so Docker Compose,
CI, and local dev all configure the app the same way.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql://assetflow:assetflow@localhost:5432/assetflow"

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 8


settings = Settings()
