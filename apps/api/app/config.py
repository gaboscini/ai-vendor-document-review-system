from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"
    embedding_model: str = "text-embedding-3-small"
    database_url: str = "postgresql+asyncpg://review:review@localhost:5432/review"
    redis_url: str = "redis://localhost:6379/0"
    demo_mode: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

