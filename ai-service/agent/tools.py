"""Las 2 tools del agente:

1. buscar_recursos  → RAG sobre ChromaDB (documentos de foco/estudio), citando fuentes.
2. consultar_mis_datos → lee las sesiones y el ánimo reales del usuario en PostgreSQL.

El id del usuario y las fuentes citadas viajan por contextvars, fijadas por el
endpoint en cada petición (evita pasarlos como argumentos que el LLM tendría que inventar).
"""
from contextvars import ContextVar

from langchain_core.tools import tool

from db import get_user_stats
from rag.store import get_vectorstore

# Contexto por petición.
current_user_id: ContextVar[str | None] = ContextVar("current_user_id", default=None)
used_sources: ContextVar[list | None] = ContextVar("used_sources", default=None)


def reset_context(user_id: str) -> None:
    current_user_id.set(user_id)
    used_sources.set([])


def collected_sources() -> list[dict]:
    """Fuentes citadas en esta petición, sin duplicados."""
    seen, out = set(), []
    for s in used_sources.get() or []:
        key = s["source"]
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


@tool
def buscar_recursos(consulta: str) -> str:
    """Busca en la base de conocimiento de Brote sobre técnicas de foco, estudio,
    productividad, manejo de la ansiedad, descanso y procrastinación. Úsala
    siempre que el usuario pida consejos o información sobre cómo concentrarse,
    estudiar mejor, organizarse o gestionar su estado de ánimo."""
    vs = get_vectorstore()
    docs = vs.similarity_search(consulta, k=4)
    if not docs:
        return "No encontré información relevante en la base de conocimiento."

    registro = used_sources.get()
    bloques = []
    for d in docs:
        title = d.metadata.get("title", "Documento")
        src = d.metadata.get("source", "desconocido")
        if registro is not None:
            registro.append({"title": title, "source": src})
        bloques.append(f"[Fuente: {title}]\n{d.page_content}")
    return "\n\n---\n\n".join(bloques)


@tool
def consultar_mis_datos() -> str:
    """Consulta los datos REALES del usuario actual en Brote: cuántas sesiones de
    foco ha completado esta semana, cuántos minutos suman y cuál fue su último
    estado de ánimo. Úsala cuando el usuario pregunte por su propio progreso,
    sus estadísticas, sus sesiones o cómo va su semana."""
    user_id = current_user_id.get()
    if not user_id:
        return "No hay un usuario identificado en esta conversación."

    stats = get_user_stats(user_id)
    if stats.get("error"):
        return stats["error"]

    animo = stats["ultimo_animo"] or "sin registrar"
    nota = f" (nota: {stats['nota_animo']})" if stats.get("nota_animo") else ""
    return (
        f"Esta semana el usuario completó {stats['sesiones_completadas_semana']} sesiones de "
        f"foco, sumando {stats['minutos_foco_semana']} minutos. "
        f"Su último estado de ánimo registrado es: {animo}{nota}."
    )


TOOLS = [buscar_recursos, consultar_mis_datos]
