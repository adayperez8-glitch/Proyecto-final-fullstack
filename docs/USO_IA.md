# 🤖 Uso de IA en Brote

Este documento explica **dónde y cómo** se usa la inteligencia artificial en el proyecto, qué decisiones se tomaron y cómo cumple los requisitos.

## 1. Asistente de foco (agente conversacional)

El corazón de la IA es un **agente LangGraph** servido por un microservicio Python (`ai-service/`), accesible desde la ruta **`/asistente`** del frontend.

### Arquitectura
```
React (/asistente) ──JWT──> ai-service (FastAPI + LangGraph)
                               ├── Tool buscar_recursos → ChromaDB (RAG)
                               └── Tool consultar_mis_datos → PostgreSQL
```

### Componentes y requisitos cubiertos
| Requisito | Implementación |
|-----------|----------------|
| Agente LangGraph con ≥2 tools | Agente ReAct (`create_react_agent`) con `buscar_recursos` y `consultar_mis_datos` — [agent/tools.py](../ai-service/agent/tools.py) |
| RAG con ≥5 documentos | 5 documentos de foco/estudio indexados en ChromaDB — [rag/docs/](../ai-service/rag/docs/) |
| Las respuestas citan las fuentes | La tool RAG devuelve `title`+`source`; el agente cita y el API los expone en `sources[]` |
| Memoria conversacional | El historial se recarga de PostgreSQL en cada turno → persiste entre turnos y reinicios |
| Maneja errores y casos límite | Try/except en el agente y en la tool de BD; respuestas degradadas en vez de romper |
| Endpoints IA | `POST /api/chat` · `POST /api/chat/stream` (SSE) · `GET /api/chat/conversations` · `GET /api/chat/history/{id}` |

### Streaming y conversaciones
- **`POST /api/chat/stream`** responde por **SSE token a token** (efecto máquina de
  escribir en el frontend): evento `meta` (conversation_id) → `token`* → `done`
  (fuentes citadas). El agente corre en un hilo propio para que las contextvars
  de las tools (usuario y fuentes) vivan en un único contexto durante todo el
  stream. El frontend cae al endpoint normal si el stream no está disponible.
- **`GET /api/chat/conversations`** lista las conversaciones del usuario para
  retomarlas desde la UI (botón "🗂 Conversaciones" en `/asistente`).
- **Rate limit por usuario** (20 mensajes / 5 min, HTTP 429) para proteger la
  cuota gratuita de Gemini.

### Modelo
- **LLM**: Google **Gemini** (`gemini-2.0-flash`).
- **Embeddings**: `text-embedding-004`.
- Se eligió Gemini por su **capa gratuita** generosa, adecuada para un proyecto de bootcamp.

### Decisión técnica destacable
El microservicio es **independiente** del backend Node pero **comparte el `JWT_SECRET` y la base de datos**: así reutiliza la autenticación existente (sin duplicar usuarios) y el agente puede leer los datos reales del usuario para dar respuestas personalizadas, manteniendo cada backend en su lenguaje idóneo (Node para CRUD, Python para IA).

## 2. Automatización (N8N)

Dos workflows conectados a la API mediante endpoints internos (`x-api-key`),
exportados como JSON en [n8n-workflows/](../n8n-workflows/):

- **Felicitación de sesión**: al completar una cuenta atrás, la API avisa a un
  webhook; un **Switch** elige el mensaje según el tipo (📚 estudio / 💻 trabajo)
  y el bot **Brote** envía un MD que llega **en vivo** (SSE) al usuario.
- **Limpieza de historias**: cron horario + **IF** sobre el endpoint de purga.

Si N8N está apagado, la app funciona igual (webhook *fire-and-forget*).

## 3. Uso de IA en el desarrollo

El proyecto se desarrolló con asistencia de IA (Claude Code) para scaffolding, revisión y documentación. Todo el código fue revisado y probado (tests del backend + smoke test del servicio de IA).

## 4. Cómo probarlo
1. Backend Node en marcha (`npm run dev`) con la BD sembrada (`npm run seed`).
2. Servicio de IA en marcha (`uvicorn main:app --port 8000`) tras `python -m rag.ingest`.
3. Frontend (`npm run dev`) → entra en **/asistente** y pregunta, p.ej.:
   - *"¿Cómo dejo de procrastinar?"* → respuesta con **fuentes citadas** (RAG),
     apareciendo **en streaming** (token a token).
   - *"¿Cómo va mi semana de foco?"* → usa la tool de **BD** con tus datos reales.
4. Para la automatización: `n8n start`, inicia una sesión corta (1 min) y complétala —
   en segundos llega el MD de felicitación del bot **Brote** (badge del sobre incluido).
