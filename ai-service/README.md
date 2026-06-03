# 🤖 Brote · Servicio de IA (FastAPI + LangGraph + RAG)

Microservicio Python que expone el **asistente de foco** de Brote: un agente
**LangGraph** con **2 tools**, **memoria conversacional** y **RAG** sobre ChromaDB.
Comparte el `JWT_SECRET` y la base de datos PostgreSQL con el backend Node.

## 🧠 Qué hace

- **Agente LangGraph (ReAct)** con dos herramientas:
  - `buscar_recursos` → **RAG** sobre documentos de foco/estudio (ChromaDB); **cita las fuentes**.
  - `consultar_mis_datos` → lee tus sesiones y ánimo reales de **PostgreSQL**.
- **Memoria conversacional**: recarga el historial desde la BD en cada turno (persiste entre turnos y reinicios).
- **Modelo**: Google **Gemini** (`gemini-2.0-flash`) + embeddings `text-embedding-004`.
- **Modo demo sin clave**: si no defines `GOOGLE_API_KEY`, arranca con embeddings y respuestas simuladas para probar el flujo.

## 📁 Estructura
```
ai-service/
├── main.py            # FastAPI: /api/chat, /api/chat/history/{id}, /health
├── config.py          # settings (Pydantic) leídos de .env
├── auth.py            # valida el JWT de Node (HS256)
├── db.py              # persistencia del chat + lectura de tablas Prisma
├── schemas.py         # modelos Pydantic v2
├── agent/
│   ├── agent.py       # agente LangGraph + prompt + memoria
│   └── tools.py       # las 2 tools (RAG + DB)
└── rag/
    ├── docs/          # 5 documentos de dominio (.md)
    ├── ingest.py      # indexa los docs en ChromaDB
    └── store.py       # vector store + embeddings
```

## 🚀 Puesta en marcha (local)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate            # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt

copy .env.example .env            # y edítalo (ver abajo)
python -m rag.ingest              # indexa los 5 documentos en ChromaDB
uvicorn main:app --reload --port 8000
```

Variables clave de `.env`:
- `JWT_SECRET` — **idéntico** al del backend Node (para validar sus tokens).
- `DATABASE_URL` — la **misma** que usa Prisma.
- `GOOGLE_API_KEY` — gratis en https://aistudio.google.com/apikey (sin ella → modo demo).

> Tras poner una `GOOGLE_API_KEY` real, **vuelve a ejecutar `python -m rag.ingest`**
> para reindexar con embeddings de Gemini (el índice en modo demo no sirve para búsqueda real).

## 🔌 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/chat` | Envía un mensaje. Body: `{ message, conversation_id? }` → `{ conversation_id, reply, sources[] }` |
| GET | `/api/chat/history/{conversation_id}` | Historial de la conversación |
| GET | `/health` | Estado del servicio |

Todas las rutas `/api/*` requieren `Authorization: Bearer <token>` (el JWT que emite Node).

## 📖 Documentación interactiva (Swagger)
FastAPI genera **Swagger** automáticamente en **`http://localhost:8000/docs`**
(y ReDoc en `/redoc`).

## ✅ Probar sin frontend
```bash
# 1. Consigue un token logueándote en el backend Node (POST /api/auth/login)
# 2. Llama al chat:
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d "{\"message\": \"¿Cómo dejo de procrastinar?\"}"
```
