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

## 2. Coach de ánimo (automatización con IA)

Cuando un usuario registra un **ánimo negativo**, un workflow de **N8N** genera un mensaje de apoyo:
- Lógica condicional (**Switch** + **IF**) decide el tipo de mensaje. La variante
  "ayer fue positivo" usa el **último ánimo de un día anterior** (no el
  inmediatamente previo), para que registrar varios ánimos hoy no la tape.
- El texto se genera con **IA (OpenAI) con _fallback_ a plantilla** si el LLM no
  está disponible (o si N8N bloquea `$env`, comportamiento por defecto en 2.x).
- Se publica como reacción del bot **Brote** sobre el ánimo y **se muestra en la
  app**: el dueño lo ve en la tarjeta verde bajo "¿Cómo te sientes hoy?" del feed
  (llega en vivo por SSE) y sus amigos lo ven sobre su tarjeta de sesión.

Detalle en [n8n-workflows/README.md](../n8n-workflows/README.md).

## 3. Uso de IA en el desarrollo

El proyecto se desarrolló con asistencia de IA (Claude Code) para scaffolding, revisión y documentación. Todo el código fue revisado y probado (tests del backend + smoke test del servicio de IA).

## 4. Cómo probarlo
1. Backend Node en marcha (`npm run dev`) con la BD sembrada (`npm run seed`).
2. Servicio de IA en marcha (`uvicorn main:app --port 8000`) tras `python -m rag.ingest`.
3. Frontend (`npm run dev`) → entra en **/asistente** y pregunta, p.ej.:
   - *"¿Cómo dejo de procrastinar?"* → respuesta con **fuentes citadas** (RAG),
     apareciendo **en streaming** (token a token).
   - *"¿Cómo va mi semana de foco?"* → usa la tool de **BD** con tus datos reales.
4. Para el coach de ánimo: `n8n start` y registra un ánimo negativo en el feed —
   en unos segundos aparece el mensaje del bot Brote bajo tu selector de ánimo.
