"""Configuración centralizada del microservicio de IA (leída de variables de entorno)."""
from functools import lru_cache
from urllib.parse import urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Servidor ──────────────────────────────────────────────
    port: int = 8000
    cors_origin: str = "http://localhost:5173"

    # ── Seguridad: mismo secreto JWT que el backend Node (HS256) ─
    jwt_secret: str = "dev-insecure-secret-change-me"

    # ── Base de datos (la misma que usa Prisma) ───────────────
    database_url: str = ""

    # ── IA: Google Gemini ─────────────────────────────────────
    google_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    embedding_model: str = "models/text-embedding-004"

    # ── RAG / ChromaDB ────────────────────────────────────────
    chroma_dir: str = "chroma_db"
    chroma_collection: str = "brote-recursos"

    @property
    def has_ai(self) -> bool:
        """Si no hay clave, el servicio funciona en modo 'fake' (para probar el flujo)."""
        return bool(self.google_api_key)

    @property
    def sqlalchemy_url(self) -> str:
        """Convierte la URL de Prisma (postgresql://...?schema=public) a una válida
        para SQLAlchemy/psycopg2 (sin el parámetro 'schema', propio de Prisma)."""
        if not self.database_url:
            return ""
        parts = urlsplit(self.database_url)
        scheme = "postgresql+psycopg2" if parts.scheme.startswith("postgres") else parts.scheme
        # Quita el query string (Prisma usa ?schema=public, que psycopg2 no entiende).
        return urlunsplit((scheme, parts.netloc, parts.path, "", ""))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
