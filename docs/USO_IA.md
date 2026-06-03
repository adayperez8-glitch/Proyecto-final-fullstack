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
| Endpoints IA | `POST /api/chat` y `GET /api/chat/history/{id}` |

### Modelo
- **LLM**: Google **Gemini** (`gemini-2.0-flash`).
- **Embeddings**: `text-embedding-004`.
- Se eligió Gemini por su **capa gratuita** generosa, adecuada para un proyecto de bootcamp.

### Decisión técnica destacable
El microservicio es **independiente** del backend Node pero **comparte el `JWT_SECRET` y la base de datos**: así reutiliza la autenticación existente (sin duplicar usuarios) y el agente puede leer los datos reales del usuario para dar respuestas personalizadas, manteniendo cada backend en su lenguaje idóneo (Node para CRUD, Python para IA).

## 2. Coach de ánimo (automatización con IA)

Cuando un usuario registra un **ánimo negativo**, un workflow de **N8N** genera un mensaje de apoyo:
- Lógica condicional (**Switch** + **IF**) decide el tipo de mensaje (incluida la variante "ayer fue positivo").
- El texto se genera con **IA (Gemini/OpenAI) con _fallback_ a plantilla** si el LLM no está disponible.
- Se publica como reacción del bot **Brote** sobre el ánimo.

Detalle en [n8n-workflows/README.md](../n8n-workflows/README.md).

## 3. Uso de IA en el desarrollo

El proyecto se desarrolló con asistencia de IA (Claude Code) para scaffolding, revisión y documentación. Todo el código fue revisado y probado (tests del backend + smoke test del servicio de IA).

## 4. Cómo probarlo
1. Backend Node en marcha (`npm run dev`) con la BD sembrada (`npm run seed`).
2. Servicio de IA en marcha (`uvicorn main:app --port 8000`) tras `python -m rag.ingest`.
3. Frontend (`npm run dev`) → entra en **/asistente** y pregunta, p.ej.:
   - *"¿Cómo dejo de procrastinar?"* → respuesta con **fuentes citadas** (RAG).
   - *"¿Cómo va mi semana de foco?"* → usa la tool de **BD** con tus datos reales.
