"""Microservicio de IA de Brote — FastAPI + LangGraph + RAG (ChromaDB) + Gemini.

Expone el chat con el agente (normal y en streaming SSE). Comparte el
JWT_SECRET y la base de datos con el backend Node. Swagger en /docs.
"""
import json
import queue
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agent.agent import answer, stream_answer
from agent.tools import collected_sources
from auth import current_user_id
from config import settings
from db import (
    add_message,
    conversation_owner,
    create_conversation,
    get_messages,
    init_db,
    list_conversations,
)
from rag.ingest import ensure_index
from schemas import ChatRequest, ChatResponse, ConversationsResponse, HistoryResponse


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()  # crea las tablas del chat si no existen
    ensure_index()  # reconstruye el índice RAG si está vacío (disco efímero en hosting)
    yield


app = FastAPI(
    title="Brote · Servicio de IA",
    description="Agente de foco con RAG y memoria. Comparte JWT y BD con el backend.",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Límite de frecuencia del chat ─────────────────────────────────
# Protege la cuota de Gemini: máx. RATE_MAX mensajes por usuario cada
# RATE_WINDOW_S segundos. En memoria (una instancia), igual que en el backend.
RATE_MAX = 20
RATE_WINDOW_S = 300
_hits: dict[str, deque] = defaultdict(deque)


def _check_rate(user_id: str) -> None:
    now = time.monotonic()
    dq = _hits[user_id]
    while dq and now - dq[0] > RATE_WINDOW_S:
        dq.popleft()
    if len(dq) >= RATE_MAX:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Has alcanzado el límite de mensajes por ahora. Dale un respiro al asistente 🌱",
        )
    dq.append(now)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "service": "brote-ai", "ai": "gemini" if settings.has_ai else "fake"}


def _require_owner(conversation_id: str, user_id: str) -> None:
    owner = conversation_owner(conversation_id)
    if owner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversación no encontrada")
    if owner != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Esta conversación no es tuya")


def _resolve_conversation(body: ChatRequest, user_id: str) -> str:
    if body.conversation_id:
        _require_owner(body.conversation_id, user_id)
        return body.conversation_id
    return create_conversation(user_id, title=body.message[:60])


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"])
def chat(body: ChatRequest, user_id: str = Depends(current_user_id)):
    """Envía un mensaje al agente. Si no se pasa conversation_id, se crea una
    conversación nueva. La respuesta incluye las fuentes citadas (RAG)."""
    _check_rate(user_id)
    conversation_id = _resolve_conversation(body, user_id)

    history = get_messages(conversation_id)  # turnos anteriores (memoria)
    add_message(conversation_id, "user", body.message)

    reply, sources = answer(history, body.message, user_id)
    add_message(conversation_id, "assistant", reply, sources)

    return ChatResponse(conversation_id=conversation_id, reply=reply, sources=sources)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/chat/stream", tags=["chat"])
def chat_stream(body: ChatRequest, user_id: str = Depends(current_user_id)):
    """Igual que /api/chat pero en streaming (SSE): la respuesta llega token a
    token (efecto máquina de escribir). Eventos: meta → token* → done | error."""
    _check_rate(user_id)
    conversation_id = _resolve_conversation(body, user_id)

    history = get_messages(conversation_id)
    add_message(conversation_id, "user", body.message)

    # El agente corre en un hilo propio: así todo (contextvars de las tools,
    # recogida de fuentes y persistencia) sucede en un único contexto, y el
    # endpoint solo va sirviendo los trozos según llegan a la cola.
    frames: queue.Queue = queue.Queue()

    def producer():
        parts: list[str] = []
        try:
            try:
                for token in stream_answer(history, body.message, user_id):
                    parts.append(token)
                    frames.put(_sse("token", {"t": token}))
            except Exception:  # noqa: BLE001 — degradar con gracia, nunca colgar el stream
                frames.put(_sse("error", {"detail": "El asistente tuvo un problema. Inténtalo de nuevo."}))
            reply = "".join(parts).strip()
            sources = collected_sources()
            if reply:
                add_message(conversation_id, "assistant", reply, sources)
            frames.put(_sse("done", {"sources": sources}))
        finally:
            frames.put(None)  # fin del stream

    threading.Thread(target=producer, daemon=True).start()

    def gen():
        yield _sse("meta", {"conversation_id": conversation_id})
        while True:
            frame = frames.get()
            if frame is None:
                break
            yield frame

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/chat/conversations", response_model=ConversationsResponse, tags=["chat"])
def conversations(user_id: str = Depends(current_user_id)):
    """Lista las conversaciones del usuario (para retomarlas desde la UI)."""
    return ConversationsResponse(conversations=list_conversations(user_id))


@app.get("/api/chat/history/{conversation_id}", response_model=HistoryResponse, tags=["chat"])
def history(conversation_id: str, user_id: str = Depends(current_user_id)):
    """Devuelve el historial completo de una conversación del usuario."""
    _require_owner(conversation_id, user_id)
    return HistoryResponse(
        conversation_id=conversation_id,
        messages=get_messages(conversation_id),
    )
