from __future__ import annotations

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "wechat-moments backend"
    app_env: str = "local"
    database_url: str = "postgresql+psycopg://app:app@127.0.0.1:5432/wechat_moments"
    redis_url: str = "redis://127.0.0.1:6379/0"
    jwt_secret_key: str = "replace-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    s3_bucket: str = "wechat-moments-dev"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_endpoint: str = ""
    s3_public_base_url: str = ""
    s3_region: str = "us-east-1"
    s3_force_path_style: bool = True
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://172.16.10.191:3000"
    )
    seed_demo_username: str = "creator"
    discover_hot_sync_enabled: bool = True
    discover_hot_sync_interval_seconds: int = 21600
    discover_hot_sync_timeout_seconds: int = 15

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @model_validator(mode="after")
    def validate_runtime_database(self) -> "Settings":
        if self.database_url.startswith("sqlite") and self.app_env != "test":
            raise ValueError(
                "SQLite is only allowed for APP_ENV=test; runtime environments must use PostgreSQL."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
