"""Modelos Pydantic v2 para las peticiones y respuestas del chat."""
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Mensaje del usuario")
    conversation_id: str | None = Field(
        default=None, description="Si se omite, se crea una conversación nueva"
    )


class Source(BaseModel):
    title: str
    source: str


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    sources: list[Source] = []


class MessageOut(BaseModel):
    role: str
    content: str
    sources: list[Source] = []
    created_at: datetime


class HistoryResponse(BaseModel):
    conversation_id: str
    messages: list[MessageOut]


class ConversationOut(BaseModel):
    id: str
    title: str | None = None
    created_at: datetime | None = None


class ConversationsResponse(BaseModel):
    conversations: list[ConversationOut]
