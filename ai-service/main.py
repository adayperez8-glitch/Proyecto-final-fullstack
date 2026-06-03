"""Microservicio de IA de Brote — FastAPI + LangGraph + RAG (ChromaDB) + Gemini.

Expone el chat con el agente. Comparte el JWT_SECRET y la base de datos con el
backend Node. Documentación interactiva (Swagger) en /docs.
"""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from agent.agent import answer
from auth import current_user_id
from config import settings
from db import (
    add_message,
    conversation_owner,
    create_conversation,
    get_messages,
    init_db,
)
from schemas import ChatRequest, ChatResponse, HistoryResponse


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()  # crea las tablas del chat si no existen
    yield


app = FastAPI(
    title="Brote · Servicio de IA",
    description="Agente de foco con RAG y memoria. Comparte JWT y BD con el backend.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "service": "brote-ai", "ai": "gemini" if settings.has_ai else "fake"}


def _require_owner(conversation_id: str, user_id: str) -> None:
    owner = conversation_owner(conversation_id)
    if owner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversación no encontrada")
    if owner != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Esta conversación no es tuya")


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"])
def chat(body: ChatRequest, user_id: str = Depends(current_user_id)):
    """Envía un mensaje al agente. Si no se pasa conversation_id, se crea una
    conversación nueva. La respuesta incluye las fuentes citadas (RAG)."""
    if body.conversation_id:
        _require_owner(body.conversation_id, user_id)
        conversation_id = body.conversation_id
    else:
        conversation_id = create_conversation(user_id, title=body.message[:60])

    history = get_messages(conversation_id)  # turnos anteriores (memoria)
    add_message(conversation_id, "user", body.message)

    reply, sources = answer(history, body.message, user_id)
    add_message(conversation_id, "assistant", reply, sources)

    return ChatResponse(conversation_id=conversation_id, reply=reply, sources=sources)


@app.get("/api/chat/history/{conversation_id}", response_model=HistoryResponse, tags=["chat"])
def history(conversation_id: str, user_id: str = Depends(current_user_id)):
    """Devuelve el historial completo de una conversación del usuario."""
    _require_owner(conversation_id, user_id)
    return HistoryResponse(
        conversation_id=conversation_id,
        messages=get_messages(conversation_id),
    )
