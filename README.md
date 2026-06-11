# 🌱 Brote

[![CI](https://github.com/adayperez8-glitch/Proyecto-final-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/adayperez8-glitch/Proyecto-final-fullstack/actions/workflows/ci.yml)

**Red social de foco.** La gente abre sesiones de estudio o trabajo con una **cuenta atrás** visible para sus amigos, que empieza en coral y florece a verde al completarse. Comparte tu estado de ánimo, sube historias de 24 h y motívate con los demás: reacciones de apoyo, comentarios flotantes sobre la cuenta atrás y mensajes — todo **en tiempo real** (SSE). Cada sesión completada planta un brote en tu **jardín** y alarga tu **racha** de días de foco.

> Proyecto final fullstack — conecta un frontend React con un backend Node/Express/PostgreSQL. Estética cálida "café de estudio" (marrón + rosa pastel), mobile-first e instalable como **PWA**. Principios YAGNI / DRY / KISS.

**🌍 En producción:** [app (Vercel)](https://proyecto-final-fullstack-2h3x.vercel.app) · [API (Render)](https://proyecto-final-fullstack-0eyv.onrender.com/health) · [IA (Render)](https://brote-ai.onrender.com/health) · BD en Neon. *(Plan free: el primer arranque puede tardar ~50 s.)*

---

## 🧱 Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 · Vite · React Router v6 · Context API · CSS Modules · PWA |
| Backend | Node.js · Express 5 · Prisma 6 (ORM) · JWT · zod · nodemailer · SSE |
| IA | Python · FastAPI · LangGraph · ChromaDB (RAG) · Gemini (streaming) |
| Integración externa | Email transaccional (nodemailer) |
| Base de datos | PostgreSQL |
| Tests / CI | Runner nativo de Node (`node --test`) + Supertest · GitHub Actions |

## 📁 Estructura (monorepo)

```
proyecto final fullstack/
├── backend/                # API REST (Express + Prisma)
│   ├── prisma/             # schema.prisma + seed.js
│   ├── src/
│   │   ├── config/ lib/ utils/ services/ middleware/
│   │   ├── modules/        # auth, users, sessions, moods, stories,
│   │   │                   #   reactions, comments, messages, friends, stats
│   │   ├── app.js  routes.js  server.js
│   │   └── ...
│   └── tests/              # 37 tests (lógica + API + integración con BD)
├── frontend/               # React (Vite)
│   └── src/
│       ├── components/ pages/ context/ hooks/ lib/ styles/
│       └── main.jsx  App.jsx
├── ai-service/             # Microservicio de IA (FastAPI + LangGraph + RAG)
│   ├── agent/  rag/  main.py  config.py  db.py  auth.py
│   └── README.md
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
| GET | `/stories/feed` | Historias activas (24 h) de mis amigos |
| POST | `/stories` | Subir historia |
| GET | `/stories/:id` | Historia + respuestas públicas *(solo amigos)* |
| DELETE | `/stories/:id` | Borrar historia (autor/admin) |
| POST | `/reactions` · DELETE `/reactions/:id` | Apoyo a un ánimo |
| POST | `/comments` · DELETE `/comments/:id` | Comentario flotante en una cuenta atrás |
| POST | `/messages` | MD o respuesta a historia (pública/privada) |
| GET | `/messages` | Bandeja privada (paginada: `?limit=&before=`) |
| PATCH | `/messages/:id/read` | Marcar como leído |
| GET | `/friends` · DELETE `/friends/:friendId` | Mis amigos · dejar de ser amigos |
| POST | `/friends/requests` | Enviar solicitud de amistad `{ toId }` |
| GET | `/friends/requests` | Solicitudes pendientes (recibidas y enviadas) |
| PATCH | `/friends/requests/:id/accept` | Aceptar solicitud → nace la amistad |
| DELETE | `/friends/requests/:id` | Rechazar/cancelar solicitud |
| GET | `/stats/me` | Rachas, minutos por día, jardín y últimos ánimos |
| GET | `/events?token=` | **Tiempo real (SSE):** eventos `feed`, `message`, `friend` |

> 🔒 **Privacidad:** la amistad requiere solicitud + aceptación, y el contenido (sesiones, historias, ánimo) solo lo ven los amigos — la regla se aplica en *todos* los endpoints, no solo en el feed. ⏱️ **Anti-trampas:** una sesión solo puede completarse cuando su cuenta atrás llega a cero (las rachas no se pueden falsear). 🚦 Endpoints de escritura con límite de frecuencia.

## ✉️ Integración externa (email)
Emails transaccionales con **nodemailer**: bienvenida al registrarse y celebración al completar una sesión de foco. En desarrollo sin SMTP configurado, se imprimen por consola (no rompe nada). Las historias caducadas (>24 h) se purgan de forma perezosa al leer/crear historias, sin procesos externos.

## 🧠 Asistente de IA
Microservicio Python ([ai-service/](ai-service/)) con un **agente LangGraph** (2 tools: RAG + datos del usuario), **memoria conversacional** y **RAG sobre ChromaDB** (5 documentos, citando fuentes). Accesible desde la ruta **`/asistente`** del frontend, con la respuesta **en streaming** (token a token) y lista de conversaciones para retomarlas.
- Endpoints: `POST /api/chat` · `POST /api/chat/stream` (SSE) · `GET /api/chat/conversations` · `GET /api/chat/history/{id}` (JWT compartido con Node, rate limit por usuario).
- **Swagger** automático en `/docs`.
- Detalle y decisiones: [docs/USO_IA.md](docs/USO_IA.md).

## 📚 Documentación
- **Swagger** del servicio de IA: `http://localhost:8000/docs`.
- **Postman**: [docs/brote.postman_collection.json](docs/brote.postman_collection.json) (Auth · Recursos · Amigos · Estadísticas · IA).
- **Uso de IA**: [docs/USO_IA.md](docs/USO_IA.md).

## 🧪 Tests y CI
```bash
cd backend && npm test     # 37 tests
```
Cubren la lógica de la cuenta atrás, **rachas y estadísticas**, hashing de contraseñas, JWT, validación con zod, la API (health, 404, validación de errores) y **4 tests de integración con BD real**: registro → login → reglas de sesiones → solicitudes de amistad → privacidad entre amigos (se saltan solos si no hay BD).

**CI:** GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) corre los tests del backend contra un PostgreSQL efímero y el build del frontend en cada push.

---

## 🗄️ Modelo de datos (9 tablas)
`User` · `FocusSession` · `Mood` · `Story` · `Reaction` · `Comment` · `Message` · `Friendship` · `FriendRequest` — ver [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

> ⚠️ Cambios de schema en las BD existentes: con SQL idempotente en [backend/prisma/sql/](backend/prisma/sql/) (`npx prisma db execute --schema prisma/schema.prisma --file ...`), no con `migrate dev`/`db push` — el ai-service tiene tablas propias (`ai_*`) fuera de Prisma y esos comandos intentarían borrarlas.

## ☁️ Despliegue (producción real)
- **Frontend:** Vercel (proyecto Vite estático, root `frontend`). Variables `VITE_API_URL` y `VITE_AI_URL` (build-time → redeploy al cambiarlas).
- **Backend:** Render Web Service Node (root `backend`, start `npm run start:prod`). Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (URL exacta de Vercel, sin barra final), `CLOUDINARY_URL` (fotos/vídeos persistentes), `SMTP_*`.
- **ai-service:** Render Web Service Python (root `ai-service`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`). Mismo `JWT_SECRET` que el backend.
- **Base de datos:** Neon (PostgreSQL serverless, plan free).

## 🔐 Notas
- Contraseñas hasheadas con bcrypt; nunca se exponen.
- Validación en todos los endpoints (zod) y manejo de errores centralizado.
- Integración externa: email transaccional (nodemailer); en desarrollo sin SMTP, se imprime por consola.
