# 🌱 Brote

**Red social de foco.** La gente abre sesiones de estudio o trabajo con una **cuenta atrás** visible para todos, que empieza en coral y florece a verde al completarse. Comparte tu estado de ánimo, sube historias de 24 h y motívate con los demás: reacciones de apoyo, comentarios flotantes sobre la cuenta atrás y mensajes (privados o públicos).

> Proyecto final fullstack — conecta un frontend React con un backend Node/Express/PostgreSQL. Estética cálida "café de estudio" (marrón + rosa pastel), mobile-first. Principios YAGNI / DRY / KISS.

---

## 🧱 Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 · Vite · React Router v6 · Context API · CSS Modules |
| Backend | Node.js · Express 5 · Prisma 6 (ORM) · JWT · zod · nodemailer |
| IA | Python · FastAPI · LangGraph · ChromaDB (RAG) · Gemini |
| Automatización | N8N (2 workflows) |
| Base de datos | PostgreSQL |
| Tests | Runner nativo de Node (`node --test`) + Supertest |

## 📁 Estructura (monorepo)

```
proyecto final fullstack/
├── backend/                # API REST (Express + Prisma)
│   ├── prisma/             # schema.prisma + seed.js
│   ├── src/
│   │   ├── config/ lib/ utils/ services/ middleware/
│   │   ├── modules/        # auth, users, sessions, moods, stories,
│   │   │                   #   reactions, comments, messages
│   │   ├── app.js  routes.js  server.js
│   │   └── ...
│   └── tests/              # 24 tests (lógica + API)
├── frontend/               # React (Vite)
│   └── src/
│       ├── components/ pages/ context/ hooks/ lib/ styles/
│       └── main.jsx  App.jsx
├── ai-service/             # Microservicio de IA (FastAPI + LangGraph + RAG)
│   ├── agent/  rag/  main.py  config.py  db.py  auth.py
│   └── README.md
├── n8n-workflows/          # Automatizaciones N8N (JSON + guía)
├── docs/                   # Postman + uso de IA
│   ├── brote.postman_collection.json
│   └── USO_IA.md
├── REQUISITOS.md           # Especificación del proyecto
└── README.md
```

---

## 🚀 Puesta en marcha (local)

### 0. Requisitos
- Node 18+ y una base de datos **PostgreSQL** (local o en la nube, p.ej. Railway).

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env           # y edita DATABASE_URL + JWT_SECRET
npx prisma migrate dev --name init
npm run seed                   # datos de demo
npm run dev                    # http://localhost:3000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env           # VITE_API_URL=http://localhost:3000 · VITE_AI_URL=http://localhost:8000
npm run dev                    # http://localhost:5173
```

### 3. Servicio de IA (opcional para el chat)
```bash
cd ai-service
python -m venv .venv && .venv\Scripts\activate   # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # JWT_SECRET (= el de Node), DATABASE_URL (la misma), GOOGLE_API_KEY
python -m rag.ingest           # indexa los 5 documentos en ChromaDB
uvicorn main:app --reload --port 8000   # Swagger en http://localhost:8000/docs
```
Guía completa: [ai-service/README.md](ai-service/README.md).

### 👤 Usuarios de demo (tras el seed)
| Usuario | Email | Rol |
|---------|-------|-----|
| ada | `ada@brote.app` | ADMIN |
| linus, grace, alan, margaret | `<user>@brote.app` | USER |

Contraseña de todos: **`password123`**

---

## 🔌 API REST

Base: `/api`. Todas las rutas (salvo register/login) requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro (devuelve `{ usuario, token }`) |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/users` | Lista de usuarios (admin ve email) |
| GET | `/users/online` | Conectados ahora |
| GET | `/users/:username` | Perfil + sesión activa + ánimo + historias |
| PATCH | `/users/me` | Editar mi perfil |
| DELETE | `/users/:id` | Eliminar usuario *(admin)* |
| PATCH | `/users/:id/role` | Cambiar rol *(admin)* |
| GET | `/sessions/feed` | Feed de quién se enfoca hoy |
| GET | `/sessions/me` | Mi sesión activa |
| POST | `/sessions` | Iniciar cuenta atrás `{ type, goalMinutes }` |
| GET | `/sessions/:id` | Detalle de sesión |
| PATCH | `/sessions/:id/complete` | Completar (dispara email) |
| PATCH | `/sessions/:id/cancel` | Cancelar |
| POST | `/moods` | Fijar mi ánimo del día |
| GET | `/moods/me` · `/moods/:id` | Mi ánimo · detalle con reacciones |
| GET | `/stories/feed` | Historias activas (24 h) |
| POST | `/stories` | Subir historia |
| GET | `/stories/:id` | Historia + respuestas públicas |
| DELETE | `/stories/:id` | Borrar historia (autor/admin) |
| POST | `/reactions` · DELETE `/reactions/:id` | Apoyo a un ánimo |
| POST | `/comments` · DELETE `/comments/:id` | Comentario flotante en una cuenta atrás |
| POST | `/messages` | MD o respuesta a historia (pública/privada) |
| GET | `/messages` | Bandeja privada |
| PATCH | `/messages/:id/read` | Marcar como leído |

### Endpoints internos (automatizaciones)
Protegidos por cabecera `x-api-key` (no JWT). Los llama N8N — ver [n8n-workflows/](n8n-workflows/).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/maintenance/stories/cleanup` | Borra historias expiradas (>24 h), devuelve `{ deleted }` |
| POST | `/maintenance/coach/reaction` | Crea la reacción de apoyo del bot **Brote** sobre un ánimo |

## 🤖 Automatizaciones (N8N)
Dos workflows en [n8n-workflows/](n8n-workflows/) (exportados como JSON):
- **Limpieza de historias** — cron horario + nodo **IF**: borra las historias de >24 h.
- **Coach de ánimo** — webhook desde `POST /moods` + **Switch** (ánimo negativo) e **IF** (ayer fue positivo): el bot **Brote** deja un mensaje de apoyo sobre tu ánimo, generado con **IA y fallback a plantilla**.

Configuración e importación: [n8n-workflows/README.md](n8n-workflows/README.md).

## 🧠 Asistente de IA
Microservicio Python ([ai-service/](ai-service/)) con un **agente LangGraph** (2 tools: RAG + datos del usuario), **memoria conversacional** y **RAG sobre ChromaDB** (5 documentos, citando fuentes). Accesible desde la ruta **`/asistente`** del frontend.
- Endpoints: `POST /api/chat` · `GET /api/chat/history/{id}` (JWT compartido con Node).
- **Swagger** automático en `/docs`.
- Detalle y decisiones: [docs/USO_IA.md](docs/USO_IA.md).

## 📚 Documentación
- **Swagger** del servicio de IA: `http://localhost:8000/docs`.
- **Postman**: [docs/brote.postman_collection.json](docs/brote.postman_collection.json) (Auth · Recursos · IA · Mantenimiento).
- **Uso de IA**: [docs/USO_IA.md](docs/USO_IA.md).

## 🧪 Tests
```bash
cd backend && npm test     # 24 tests
```
Cubren la lógica de la cuenta atrás, clasificación de ánimos (coach), hashing de contraseñas, JWT, validación con zod y la API (health, 404, validación de errores).

---

## 🗄️ Modelo de datos (7 tablas)
`User` · `FocusSession` · `Mood` · `Story` · `Reaction` · `Comment` · `Message` — ver [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

## ☁️ Despliegue
- **Base de datos + Backend:** Railway (PostgreSQL + servicio Node). Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `SMTP_*`. Build: `npm install && npx prisma migrate deploy`. Start: `npm start`.
- **Frontend:** Vercel o Netlify. Variable `VITE_API_URL` = URL pública del backend. Build: `npm run build`, salida `dist/`.
- Recuerda apuntar `CORS_ORIGIN` (backend) a la URL del frontend desplegado.

## 🔐 Notas
- Contraseñas hasheadas con bcrypt; nunca se exponen.
- Validación en todos los endpoints (zod) y manejo de errores centralizado.
- Integración externa: email transaccional (nodemailer); en desarrollo sin SMTP, se imprime por consola.
