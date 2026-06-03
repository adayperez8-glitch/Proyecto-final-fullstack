"""Acceso a base de datos:

1. Persistencia del chat en tablas propias (prefijo ai_) para no chocar con
   las tablas que gestiona Prisma.
2. Lectura de las tablas de Prisma ("FocusSession", "Mood") para que el agente
   pueda responder sobre los datos reales del usuario (tool de DB).
"""
import json
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    insert,
    select,
    text,
)

from config import settings

_engine = None
_metadata = MetaData()

ai_conversations = Table(
    "ai_conversations",
    _metadata,
    Column("id", String(64), primary_key=True),
    Column("user_id", String(64), nullable=False, index=True),
    Column("title", String(200)),
    Column("created_at", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
)

ai_chat_messages = Table(
    "ai_chat_messages",
    _metadata,
    Column("id", String(64), primary_key=True),
    Column("conversation_id", String(64), ForeignKey("ai_conversations.id"), index=True),
    Column("role", String(16), nullable=False),  # 'user' | 'assistant'
    Column("content", Text, nullable=False),
    Column("sources", Text),  # JSON con las fuentes citadas
    Column("created_at", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
)


def get_engine():
    global _engine
    if _engine is None:
        url = settings.sqlalchemy_url or "sqlite:///./brote_ai.db"
        _engine = create_engine(url, pool_pre_ping=True, future=True)
    return _engine


def init_db() -> None:
    """Crea las tablas del chat si no existen."""
    _metadata.create_all(get_engine())


# ─── Persistencia del chat ────────────────────────────────────────

def create_conversation(user_id: str, title: str | None = None) -> str:
    conv_id = uuid4().hex
    with get_engine().begin() as conn:
        conn.execute(
            insert(ai_conversations).values(
                id=conv_id, user_id=user_id, title=title or "Conversación",
                created_at=datetime.now(timezone.utc),
            )
        )
    return conv_id


def conversation_owner(conversation_id: str) -> str | None:
    with get_engine().connect() as conn:
        row = conn.execute(
            select(ai_conversations.c.user_id).where(ai_conversations.c.id == conversation_id)
        ).first()
    return row[0] if row else None


def add_message(conversation_id: str, role: str, content: str, sources: list | None = None) -> None:
    with get_engine().begin() as conn:
        conn.execute(
            insert(ai_chat_messages).values(
                id=uuid4().hex,
                conversation_id=conversation_id,
                role=role,
                content=content,
                sources=json.dumps(sources or []),
                created_at=datetime.now(timezone.utc),
            )
        )


def get_messages(conversation_id: str) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            select(ai_chat_messages)
            .where(ai_chat_messages.c.conversation_id == conversation_id)
            .order_by(ai_chat_messages.c.created_at)
        ).mappings().all()
    out = []
    for r in rows:
        out.append(
            {
                "role": r["role"],
                "content": r["content"],
                "sources": json.loads(r["sources"] or "[]"),
                "created_at": r["created_at"],
            }
        )
    return out


# ─── Lectura de datos del usuario (tablas de Prisma) ──────────────

def get_user_stats(user_id: str) -> dict:
    """Resumen de foco de la última semana + último ánimo. Lee las tablas que
    gestiona Prisma. Si la consulta falla (BD distinta, sin datos...), devuelve
    un dict con 'error' para que el agente lo gestione con elegancia."""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    try:
        with get_engine().connect() as conn:
            focus = conn.execute(
                text(
                    'SELECT COUNT(*) AS sesiones, COALESCE(SUM("goalMinutes"), 0) AS minutos '
                    'FROM "FocusSession" '
                    "WHERE \"userId\" = :uid AND status = 'COMPLETED' AND \"completedAt\" >= :since"
                ),
                {"uid": user_id, "since": week_ago},
            ).mappings().first()

            mood = conn.execute(
                text(
                    'SELECT mood, note FROM "Mood" WHERE "userId" = :uid '
                    'ORDER BY "createdAt" DESC LIMIT 1'
                ),
                {"uid": user_id},
            ).mappings().first()

        return {
            "sesiones_completadas_semana": int(focus["sesiones"]) if focus else 0,
            "minutos_foco_semana": int(focus["minutos"]) if focus else 0,
            "ultimo_animo": mood["mood"] if mood else None,
            "nota_animo": mood["note"] if mood else None,
        }
    except Exception as e:  # noqa: BLE001 — queremos degradar con gracia
        return {"error": f"No pude leer tus datos: {e}"}
