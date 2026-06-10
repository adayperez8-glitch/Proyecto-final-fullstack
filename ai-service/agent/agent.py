"""Agente LangGraph (ReAct) con memoria conversacional y las 2 tools.

La memoria "que persiste entre turnos" se logra recargando el historial de la
conversación desde PostgreSQL en cada turno y pasándoselo al agente; así
sobrevive incluso a reinicios del servicio.
"""
from functools import lru_cache

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage
from langgraph.prebuilt import create_react_agent

from config import settings
from agent.tools import TOOLS, buscar_recursos, collected_sources, reset_context

SYSTEM_PROMPT = (
    "Eres el asistente de Brote, una red social de foco para estudiar y trabajar. "
    "Tu tono es cálido, cercano y motivador, y respondes SIEMPRE en español, de forma breve.\n\n"
    "Tienes dos herramientas:\n"
    "- 'buscar_recursos': para preguntas sobre técnicas de foco, estudio, productividad, "
    "ansiedad, descanso o procrastinación. Cuando la uses, CITA la fuente entre paréntesis "
    "al final, p.ej. (Fuente: La técnica Pomodoro).\n"
    "- 'consultar_mis_datos': para preguntas sobre el progreso, las sesiones o el ánimo del "
    "propio usuario.\n\n"
    "Si la información no está en la base de conocimiento, dilo con honestidad en lugar de "
    "inventar. Si la pregunta no tiene que ver con foco, estudio o bienestar, redirígela con "
    "amabilidad hacia el propósito de Brote."
)


@lru_cache
def get_agent():
    """Construye el agente ReAct una sola vez (requiere GOOGLE_API_KEY)."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.7,
    )
    return create_react_agent(llm, TOOLS, prompt=SYSTEM_PROMPT)


def _history_to_messages(history: list[dict]) -> list:
    msgs = []
    for m in history:
        if m["role"] == "user":
            msgs.append(HumanMessage(m["content"]))
        else:
            msgs.append(AIMessage(m["content"]))
    return msgs


def _to_text(content) -> str:
    """Normaliza el contenido del modelo a texto plano. Algunos modelos
    (Gemini 2.5+) devuelven bloques [{'type': 'text', 'text': ...}, ...];
    nos quedamos solo con el texto e ignoramos bloques de 'thinking'/firma."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
    return ""


def _fake_reply(user_message: str) -> str:
    """Modo FAKE (sin clave): ejercita el RAG y devuelve un texto simulado."""
    contexto = buscar_recursos.invoke({"consulta": user_message})
    primera = contexto.split("\n", 1)[0]
    return (
        "[MODO DEMO sin clave de IA] He buscado en la base de conocimiento de Brote. "
        f"Esto es lo más relevante que encontré: {primera} "
        "Configura GOOGLE_API_KEY para obtener respuestas completas del agente."
    )


def answer(history: list[dict], user_message: str, user_id: str) -> tuple[str, list[dict]]:
    """Genera la respuesta del asistente. Devuelve (texto, fuentes citadas)."""
    reset_context(user_id)

    if not settings.has_ai:
        return _fake_reply(user_message), collected_sources()

    messages = _history_to_messages(history) + [HumanMessage(user_message)]
    try:
        result = get_agent().invoke({"messages": messages})
        reply = _to_text(result["messages"][-1].content).strip()
    except Exception as e:  # noqa: BLE001 — el agente debe degradar con gracia
        reply = f"Lo siento, tuve un problema procesando tu mensaje ({e}). Inténtalo de nuevo."
    return reply, collected_sources()


def stream_answer(history: list[dict], user_message: str, user_id: str):
    """Versión en streaming: genera la respuesta token a token (para SSE).
    Las fuentes citadas se recogen después con collected_sources(), en el
    mismo hilo que consume este generador."""
    reset_context(user_id)

    if not settings.has_ai:
        # Sin clave también se "streamea", en trocitos, para probar el flujo.
        reply = _fake_reply(user_message)
        for i in range(0, len(reply), 12):
            yield reply[i : i + 12]
        return

    messages = _history_to_messages(history) + [HumanMessage(user_message)]
    # stream_mode="messages" emite los trozos del modelo según los genera; los
    # de tipo AIMessageChunk con texto son la respuesta visible (los pasos de
    # herramientas no tienen texto y se ignoran).
    for chunk, _meta in get_agent().stream({"messages": messages}, stream_mode="messages"):
        if isinstance(chunk, AIMessageChunk):
            text = _to_text(chunk.content)
            if text:
                yield text
