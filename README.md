# 🌱 Brote — Red social de foco

[![CI](https://github.com/adayperez8-glitch/Proyecto-final-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/adayperez8-glitch/Proyecto-final-fullstack/actions/workflows/ci.yml)

¡Bienvenido a **Brote**! Una red social donde lo que compartes es tu **concentración**: abres una sesión de estudio o trabajo con una **cuenta atrás** visible para tus amigos, que empieza en coral y **florece a verde** al completarse. Comparte tu ánimo, sube historias de 24 h, anima a los demás — todo **en tiempo real** — y ve crecer tu **jardín de foco** con cada sesión completada.

> Proyecto final fullstack: React + Node/Express/PostgreSQL + microservicio de IA en Python. Estética cálida "café de estudio", mobile-first e instalable como **PWA**. Principios YAGNI / DRY / KISS.

## 🌍 Demo en producción

| Pieza | URL |
|-------|-----|
| **App** | **https://brotes.vercel.app** |
| API (backend) | https://proyecto-final-fullstack-0eyv.onrender.com/health |
| Servicio de IA | https://brote-ai.onrender.com/health |
| Base de datos | Neon (PostgreSQL serverless) |

*Plan free de Render: el primer arranque en frío puede tardar ~50 segundos.*

---

## ✨ Características

- **Cuenta atrás social**: sesiones de estudio/trabajo con anillo de progreso coral→verde, visibles para tus amigos.
- **Tiempo real (SSE)**: las sesiones, historias, ánimos, mensajes y solicitudes de tus amigos aparecen al instante, sin recargar.
- **Solicitudes de amistad**: la amistad requiere solicitud y aceptación; el contenido es privado entre amigos (y la regla se aplica en *todos* los endpoints, no solo en el feed).
- **Estados de ánimo + apoyos**: fija tu ánimo del día y recibe reacciones y mensajes de ánimo de tus amigos, en vivo.
- **Comentarios flotantes** sobre la cuenta atrás de los demás, para animar.
- **Historias de 24 h** (foto, vídeo o texto) que caducan y se purgan solas.
- **Mensajes privados** con bandeja paginada y aviso de no leídos en vivo.
- **Jardín, rachas y estadísticas**: cada sesión completada planta un brote 🌱→🌳; racha de días consecutivos, gráfica semanal (L→D) y reparto estudio/trabajo.
- **Asistente de IA**: agente LangGraph con RAG (cita sus fuentes), datos reales del usuario, respuesta **en streaming** y conversaciones guardadas.
- **Felicitación automática (N8N)**: al completar tu sesión, el bot **Brote** te felicita con un mensaje privado que llega en vivo — un workflow con **Switch** distingue estudio 📚 de trabajo 💻.
- **Panel de administración**: gestión de usuarios y roles (solo ADMIN).
- **PWA instalable** en el móvil, **emails transaccionales** y **modo demo** de la IA sin clave.

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 · Vite · React Router v6 · Context API · CSS Modules · PWA (service worker) |
| Backend | Node.js · Express 5 · Prisma 6 (ORM) · JWT · zod · nodemailer · SSE · Multer + Cloudinary |
| IA | Python · FastAPI · LangGraph (agente ReAct) · ChromaDB (RAG) · Google Gemini (streaming) |
| Automatización | N8N — 2 workflows con lógica condicional (Switch / IF) conectados a la API |
| Base de datos | PostgreSQL (Neon en producción) |
| Tests / CI | Runner nativo de Node (`node --test`) + Supertest · GitHub Actions |
| Despliegue | Vercel (frontend) · Render (backend + IA) · Neon (BD) |

## 🏛️ Arquitectura

Tres servicios + una base de datos compartida. El servicio de IA **no duplica usuarios ni login**: comparte el `JWT_SECRET` y la base de datos con el backend Node.

```
┌──────────────────────────────────────────────────┐
│        Frontend · React + Vite (PWA)             │
│        Vercel · https://brotes.vercel.app        │
└─────────┬──────────────────────┬─────────────────┘
          │ REST + JWT           │ REST + JWT
          │ SSE (tiempo real)    │ SSE (chat en streaming)
          ▼                      ▼
┌───────────────────┐    ┌─────────────────────────┐
│  Backend Node     │    │  ai-service Python      │
│  Express + Prisma │    │  FastAPI + LangGraph    │
│  Render · :3000   │    │  + ChromaDB (RAG)       │
└─────────┬─────────┘    │  Render · :8000         │
          │              └───────────┬─────────────┘
          │      mismo JWT_SECRET    │
          ▼                          ▼
┌──────────────────────────────────────────────────┐
│   PostgreSQL (Neon) — única BD compartida        │
│   tablas Prisma + tablas ai_* (chat de IA)       │
└──────────────────────────────────────────────────┘
```

## 📂 Estructura del proyecto

```
proyecto final fullstack/
├── backend/                  # API REST (Express + Prisma)
│   ├── prisma/               # schema.prisma · seed.js · sql/ (cambios idempotentes)
│   ├── src/
│   │   ├── config/           # env.js (variables de entorno, fail-fast en prod)
│   │   ├── lib/              # prisma, eventos SSE, amistades, almacenamiento, asyncHandler
│   │   ├── middleware/       # authenticate, requireRole, validate (zod), rateLimit, upload, errores
│   │   ├── services/         # token (JWT), password (bcrypt), email, loginRateLimit
│   │   ├── utils/            # countdown, stats (rachas), serializers, ApiError
│   │   ├── modules/          # un módulo por recurso: auth, users, sessions, moods,
│   │   │                     #   stories, reactions, comments, messages, friends, stats
│   │   └── app.js · routes.js · server.js
│   └── tests/                # 37 tests (lógica pura + API + integración con BD)
├── frontend/                 # React (Vite)
│   ├── public/               # manifest PWA · service worker · iconos
│   └── src/
│       ├── components/       # Layout, CountdownRing, feed/, social/, ui/
│       ├── context/          # AuthContext · EventsContext (SSE)
│       ├── hooks/            # useApi, useChat (streaming), useCountdown
│       ├── pages/            # Feed, Login, Register, Search, Profile, Messages,
│       │                     #   Stats (jardín), Asistente (IA), Admin
│       └── lib/ · styles/ · config/
├── ai-service/               # Microservicio de IA (FastAPI + LangGraph + RAG)
│   ├── agent/                # agent.py (ReAct + streaming) · tools.py (2 tools)
│   ├── rag/                  # docs/ (5 documentos) · ingest.py · store.py
│   └── main.py · auth.py · db.py · config.py · schemas.py
├── n8n-workflows/            # Automatizaciones N8N exportadas (JSON + guía)
│   ├── session-congrats.json # Webhook → Switch → MD de felicitación del bot
│   └── story-cleanup.json    # Cron → IF → limpieza de historias de +24 h
├── docs/                     # brote.postman_collection.json · USO_IA.md
├── .github/workflows/ci.yml  # CI: tests + build en cada push
└── README.md · REQUISITOS.md
```

---

## 🚀 Instalación y primeros pasos

### Prerrequisitos
- **Node.js 18+** y npm
- **PostgreSQL** (local o en la nube)
- **Python 3.12+** (solo para el asistente de IA, opcional)

### 1. Clona el repositorio
```bash
git clone https://github.com/adayperez8-glitch/Proyecto-final-fullstack.git
cd Proyecto-final-fullstack
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
```
Edita `backend/.env` con tus valores:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/brote?schema=public"
JWT_SECRET="una-cadena-larga-y-aleatoria"
CORS_ORIGIN="http://localhost:5173"
# Opcionales: CLOUDINARY_URL (fotos persistentes) y SMTP_* (emails reales;
# sin SMTP, los emails se imprimen por consola)
```
```bash
npx prisma migrate dev --name init   # crea las tablas
npm run seed                         # datos de demo
npm start                            # → http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
```
```env
VITE_API_URL=http://localhost:3000
VITE_AI_URL=http://localhost:8000
```
```bash
npm run dev                          # → http://localhost:5173
```

### 4. Servicio de IA (opcional, para el chat)
```bash
cd ai-service
python -m venv .venv && .venv\Scripts\activate   # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # JWT_SECRET (= el del backend), DATABASE_URL (la misma), GOOGLE_API_KEY
python -m rag.ingest    # indexa los 5 documentos en ChromaDB
uvicorn main:app --reload --port 8000   # Swagger → http://localhost:8000/docs
```
> Sin `GOOGLE_API_KEY` el chat funciona en **modo demo** (ejercita el RAG con respuesta simulada).

### 5. Automatización N8N (opcional, para la felicitación del bot)
```bash
npm install -g n8n
n8n start        # → http://localhost:5678
```
Importa y activa los workflows de [n8n-workflows/](n8n-workflows/) (guía en su README) y añade `INTERNAL_API_KEY` + `N8N_SESSION_WEBHOOK_URL` al `.env` del backend.

### 👤 Usuarios de demo (tras el seed)
| Usuario | Email | Rol |
|---------|-------|-----|
| ada | `ada@brote.app` | ADMIN |
| linus, grace, alan, margaret | `<usuario>@brote.app` | USER |

Contraseña de todos: **`password123`**

---

## 🔌 API REST

Base: `/api`. Todas las rutas (salvo register/login) requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro (devuelve `{ usuario, token }`) |
| POST | `/auth/login` | Login (límite anti fuerza bruta: 4 intentos/10 min) |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/users` | Lista de usuarios *(admin ve email)* |
| GET | `/users/online` · `/users/search?q=` · `/users/recommendations` | Presencia · búsqueda · "quizá conozcas" |
| GET | `/users/:username` | Perfil (contenido solo si sois amigos) |
| PATCH | `/users/me` · POST `/users/me/avatar` | Editar perfil · subir avatar |
| DELETE | `/users/:id` · PATCH `/users/:id/role` | Eliminar usuario · cambiar rol *(admin)* |
| GET | `/sessions/feed` · `/sessions/me` · `/sessions/:id` | Feed de amigos · mi sesión activa · detalle |
| POST | `/sessions` | Iniciar cuenta atrás `{ type, goalMinutes }` (1–720 min) |
| PATCH | `/sessions/:id/complete` | Completar — **solo al llegar a cero** (dispara email) |
| PATCH | `/sessions/:id/cancel` | Cancelar |
| POST | `/moods` · GET `/moods/me` · `/moods/:id` | Fijar ánimo · el mío (con apoyos) · detalle |
| GET | `/stories/feed` · `/stories/:id` | Historias activas de amigos *(solo amigos)* |
| POST | `/stories` · `/stories/upload` | Crear historia · subir foto/vídeo |
| DELETE | `/stories/:id` | Borrar historia *(autor o admin)* |
| POST | `/reactions` · DELETE `/reactions/:id` | Apoyar un ánimo (1 por persona) · quitar |
| POST | `/comments` · DELETE `/comments/:id` | Comentario flotante · borrar *(autor o admin)* |
| POST | `/messages` · GET `/messages?limit=&before=` | Enviar MD · bandeja paginada |
| GET | `/messages/unread-count` · PATCH `/messages/:id/read` | No leídos · marcar leído |
| GET | `/friends` · DELETE `/friends/:friendId` | Mis amigos · dejar de ser amigos |
| POST | `/friends/requests` | Enviar solicitud de amistad `{ toId }` |
| GET | `/friends/requests` | Pendientes (recibidas y enviadas) |
| PATCH | `/friends/requests/:id/accept` · DELETE `/friends/requests/:id` | Aceptar · rechazar/cancelar |
| GET | `/stats/me` | Rachas, semana L→D, jardín (28 días) y últimos ánimos |
| GET | `/events?token=` | **Tiempo real (SSE)**: eventos `feed`, `message`, `friend` |

**Microservicio de IA** (`:8000`, mismo JWT): `POST /api/chat` · `POST /api/chat/stream` (SSE) · `GET /api/chat/conversations` · `GET /api/chat/history/{id}` · Swagger en `/docs`.

**Endpoints internos** (los llama N8N con cabecera `x-api-key`, no JWT): `POST /maintenance/session-congrats` (crea el MD de felicitación del bot) · `POST /maintenance/stories/cleanup` (purga historias de +24 h).

> ⏱️ **Anti-trampas:** una sesión solo puede completarse cuando su cuenta atrás llega a cero (las rachas no se pueden falsear). 🚦 Los endpoints de escritura y el chat de IA tienen límite de frecuencia.

## 🔐 Matriz de roles y permisos

Aplicada **en el servidor** (`authenticate` + `requireRole`): manipular el frontend no sirve — el backend responde 401/403.

| Acción | Invitado | USER | ADMIN |
|--------|:---:|:---:|:---:|
| Registro / login | ✅ | — | — |
| Ver feed, historias y perfiles **de sus amigos** | ❌ | ✅ | ✅ |
| Sesiones, ánimo, historias y mensajes **propios** | ❌ | ✅ | ✅ |
| Solicitudes de amistad (enviar/aceptar/rechazar) | ❌ | ✅ | ✅ |
| Apoyar ánimos y comentar sesiones | ❌ | ✅ | ✅ |
| Estadísticas y jardín propios | ❌ | ✅ | ✅ |
| Chat con el asistente de IA | ❌ | ✅ | ✅ |
| Borrar contenido **propio** (historia/comentario/reacción) | ❌ | ✅ | ✅ |
| Borrar contenido **de cualquiera** | ❌ | ❌ | ✅ |
| Ver email y fecha de alta de los usuarios | ❌ | ❌ | ✅ |
| Eliminar usuarios · cambiar roles · panel `/admin` | ❌ | ❌ | ✅ |

## 🗄️ Modelo de datos (9 tablas relacionadas)

Esquema completo en [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

| Tabla | Qué guarda |
|-------|-----------|
| **User** | email, username, hash bcrypt, avatar, bio, rol USER/ADMIN, presencia (`lastSeenAt`) |
| **FocusSession** | cuenta atrás: tipo STUDY/WORK, objetivo en minutos, inicio/fin, estado ACTIVE/COMPLETED/CANCELLED |
| **Mood** | estado de ánimo del día (8 tipos) + nota opcional |
| **Story** | historia de 24 h (imagen/vídeo/texto) con `expiresAt` |
| **Reaction** | apoyo (emoji + texto opcional) sobre un **ánimo** — 1 por persona |
| **Comment** | comentario flotante sobre una **sesión** |
| **Message** | MD privado o respuesta pública a una historia |
| **FriendRequest** | solicitud de amistad pendiente (única por par from→to) |
| **Friendship** | amistad mutua aceptada (dos filas simétricas A→B y B→A) |

> Matiz de modelado: las **reacciones** cuelgan del **ánimo** (apoyan cómo te sientes) y los **comentarios** de la **sesión** (animan tu cuenta atrás). El chat de IA usa 2 tablas propias (`ai_conversations`, `ai_chat_messages`) gestionadas por el microservicio.

### 🧬 Diagrama entidad-relación

```mermaid
erDiagram
    User ||--o{ FocusSession : "abre"
    User ||--o{ Mood : "registra"
    User ||--o{ Story : "publica"
    User ||--o{ Reaction : "envia"
    User ||--o{ Comment : "escribe"
    User ||--o{ Message : "envia / recibe"
    User ||--o{ FriendRequest : "solicita / recibe"
    User ||--o{ Friendship : "es amigo de"
    Mood ||--o{ Reaction : "recibe apoyos"
    FocusSession ||--o{ Comment : "recibe comentarios"
    Story ||--o{ Message : "recibe respuestas"

    User {
        string id PK
        string email UK
        string username UK
        string displayName
        string passwordHash
        string avatarUrl
        string bio
        enum role "USER | ADMIN"
        datetime lastSeenAt
    }
    FocusSession {
        string id PK
        string userId FK
        enum type "STUDY | WORK"
        int goalMinutes
        datetime startedAt
        datetime endsAt
        enum status "ACTIVE | COMPLETED | CANCELLED"
        datetime completedAt
    }
    Mood {
        string id PK
        string userId FK
        enum mood "8 tipos"
        string note
        datetime date
    }
    Story {
        string id PK
        string userId FK
        string imageUrl
        string mediaType
        string text
        string bgColor
        datetime expiresAt
    }
    Reaction {
        string id PK
        string moodId FK
        string fromId FK
        string emoji
        string text
    }
    Comment {
        string id PK
        string sessionId FK
        string fromId FK
        string text
    }
    Message {
        string id PK
        string fromId FK
        string toId FK
        string storyId FK "opcional"
        string text
        enum visibility "PUBLIC | PRIVATE"
        datetime readAt
    }
    FriendRequest {
        string id PK
        string fromId FK
        string toId FK
        datetime createdAt
    }
    Friendship {
        string id PK
        string userId FK
        string friendId FK
    }
```

> ⚠️ **Cambios de schema** sobre las BD existentes: con SQL idempotente en [backend/prisma/sql/](backend/prisma/sql/) (`npx prisma db execute --schema prisma/schema.prisma --file ...`), no con `migrate dev`/`db push` — el ai-service tiene tablas propias (`ai_*`) fuera de Prisma y esos comandos intentarían borrarlas.

---

## 🤖 Automatización (N8N)

Dos workflows exportados como JSON en [n8n-workflows/](n8n-workflows/) (guía de importación incluida):

```
Completar sesión ─► webhook ─► Switch(¿estudio o trabajo?) ─► MD del bot Brote
                                                              (llega EN VIVO por SSE)
```

- **Felicitación de sesión** ([session-congrats.json](n8n-workflows/session-congrats.json)): al completar tu cuenta atrás, la API avisa al webhook; un **Switch** elige el mensaje según el tipo de sesión (📚 *"¡Has terminado por hoy…!"* / 💻 *"¡Sesión de trabajo completada…!"*) y el bot **Brote** te lo manda como MD, que aparece al instante con su badge.
- **Limpieza de historias** ([story-cleanup.json](n8n-workflows/story-cleanup.json)): cron horario + nodo **IF** (`deleted > 0`) sobre el endpoint de purga.

Los workflows se autentican contra los endpoints internos con `x-api-key` (= `INTERNAL_API_KEY`). Si N8N está apagado, la app funciona igual: el webhook es *fire-and-forget*.

**¿Y contra la app desplegada?** La automatización también funciona en producción **sin desplegar N8N**: una segunda variante del workflow (webhook `/webhook/brote-sesion-prod`) apunta al backend de Render, y un **túnel de Cloudflare** (`cloudflared tunnel --url http://localhost:5678`) expone el N8N local con una URL pública que se configura en Render (`N8N_SESSION_WEBHOOK_URL`). Probado de extremo a extremo en producción. Pasos detallados en [n8n-workflows/README.md](n8n-workflows/README.md).

## 🧪 Tests y CI

```bash
cd backend && npm test     # 37 tests
```
- **Lógica pura**: cuenta atrás (cálculo, progreso, color), **rachas y estadísticas** (semana L→D, jardín), hashing bcrypt, JWT, schemas zod, límite de login.
- **API**: health, 404, validación de errores.
- **4 tests de integración con BD real**: registro → login → reglas de sesiones (única activa, no completar antes de tiempo) → solicitudes de amistad → privacidad entre amigos. *(Se saltan solos si no hay BD.)*

**CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)): en cada push, GitHub Actions corre la suite contra un PostgreSQL efímero y el build del frontend.

## ☁️ Despliegue

| Pieza | Servicio | Configuración clave |
|-------|----------|---------------------|
| Frontend | **Vercel** | Proyecto Vite estático, root `frontend`. Variables `VITE_API_URL` y `VITE_AI_URL` (build-time → redeploy al cambiarlas) |
| Backend | **Render** (Node) | Root `backend`, start `npm run start:prod`. Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (admite varios orígenes separados por coma), `CLOUDINARY_URL`, `SMTP_*` |
| IA | **Render** (Python) | Root `ai-service`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. **Mismo `JWT_SECRET`** que el backend |
| BD | **Neon** | PostgreSQL serverless; conexión directa (sin `-pooler`) |
| N8N | **Local + túnel** | `cloudflared tunnel` expone el N8N local; en Render: `INTERNAL_API_KEY` + `N8N_SESSION_WEBHOOK_URL` (la URL del túnel cambia en cada arranque) |

Push a `main` → redeploy automático de las tres piezas + CI.

## ✅ Cumplimiento de requisitos

| Requisito ([REQUISITOS.md](REQUISITOS.md)) | Pedido | Entregado |
|---|---|---|
| Recursos principales de la API | ≥ 4 | **10 módulos** (auth, users, sessions, moods, stories, reactions, comments, messages, friends, stats) |
| Autenticación JWT + rutas protegidas | ✅ | JWT + middleware `authenticate`; logout automático al caducar |
| Roles (normal y admin) | ✅ | `requireRole('ADMIN')` server-side + matriz de permisos |
| Tablas PostgreSQL relacionadas | ≥ 4 | **9 tablas** con FK y cascadas (Prisma) |
| Validaciones en endpoints | ✅ | zod en **todos** los endpoints con entrada |
| Errores centralizados con códigos HTTP | ✅ | `errorHandler` único (400/401/403/404/409/429/500) |
| Variables de entorno | ✅ | `.env` fuera de git; `JWT_SECRET` obligatorio en producción (fail-fast) |
| Integración externa | ≥ 1 | **Email transaccional** (nodemailer) + Gemini + Cloudinary |
| Automatización (N8N) | workflow activo con IF/Switch + JSON en repo | **2 workflows**: felicitación de sesión (**Switch**) y limpieza de historias (**IF**), exportados en [n8n-workflows/](n8n-workflows/) |
| React 18 + Vite · Router v6 | ≥ 4 rutas | **9 rutas** (Feed, Login, Register, Buscar, Perfil, Mensajes, Estadísticas, Asistente, Admin) |
| Context API · formularios controlados · loading/error/vacío · responsive · CSS Modules | ✅ | AuthContext + EventsContext · validación por campo · `States.jsx` · mobile-first · `*.module.css` |
| Tests que pasan | ≥ 8 | **37/37** + CI en GitHub Actions |
| Despliegue (backend + frontend + BD comunicándose) | ✅ | **Funcionando en producción** (Vercel + Render ×2 + Neon) |

## 🔐 Seguridad

- Contraseñas con **bcrypt**; los serializadores garantizan que el hash jamás sale en una respuesta.
- **Rate limits**: login (anti fuerza bruta), endpoints de escritura y chat de IA.
- Subidas: extensión derivada del **mimetype real** + `nosniff` (no se puede colar HTML como imagen).
- `helmet`, CORS estricto por origen, validación zod en el borde y privacidad "solo amigos" aplicada en todos los accesos.
