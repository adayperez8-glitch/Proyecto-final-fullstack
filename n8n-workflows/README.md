# 🤖 Automatización (N8N)

Dos workflows conectados a la API de Brote. Se autentican contra los endpoints
internos con la cabecera `x-api-key` (= `INTERNAL_API_KEY` del backend).

| Workflow | Disparador | Lógica condicional | Qué hace |
|----------|-----------|--------------------|----------|
| [`session-congrats.json`](session-congrats.json) | Webhook `POST /webhook/brote-sesion` | **Switch** (¿estudio o trabajo?) | El bot **Brote** te felicita con un MD al completar una sesión |
| [`story-cleanup.json`](story-cleanup.json) | Cron (cada hora) | **IF** `deleted > 0` | Borra las historias que pasaron de 24 h |

---

## 1. Felicitación de sesión — `session-congrats.json` (el principal)

```
PATCH /sessions/:id/complete ─► webhook brote-sesion
                                     │
                              Switch(¿type?)
                              ├─ STUDY → Set "📚 ¡Has terminado por hoy…!"
                              └─ WORK  → Set "💻 ¡Sesión de trabajo completada…!"
                                     │
                       HTTP POST /api/maintenance/session-congrats (x-api-key)
                                     │
                       MD del bot Brote → llega al usuario EN VIVO (SSE)
```

Cuando completas tu cuenta atrás, la API avisa al webhook con:

```json
{ "userId": "…", "displayName": "Ada Lovelace", "type": "STUDY", "goalMinutes": 60 }
```

- El **Switch** ramifica por tipo de sesión: mensaje de **estudio** o de **trabajo**.
- El nodo HTTP llama al endpoint interno, que crea un **mensaje privado del bot
  Brote** para el usuario. Como los MD viajan por SSE, la felicitación aparece
  **al instante** en la app (badge del sobre incluido), sin recargar.

## 2. Limpieza de historias — `story-cleanup.json`

```
Schedule (cada hora) → HTTP POST /api/maintenance/stories/cleanup → IF (deleted > 0)
                                                                      ├─ sí → registrar limpieza
                                                                      └─ no → nada que borrar
```

Refuerzo del borrado de historias caducadas (la API además purga de forma
perezosa al leer/crear historias, así que nada depende de que N8N esté activo).

---

## 🚀 Cómo importar y configurar

1. **Importa** cada `.json` en N8N: *Workflows → ⋮ → Import from File*.
2. En los nodos **HTTP Request** de ambos workflows ajusta:
   - La **URL** (`http://localhost:3000` → la URL de tu backend).
   - La cabecera **`x-api-key`** → el valor de tu `INTERNAL_API_KEY`
     (los JSON traen el placeholder `REEMPLAZA_POR_TU_INTERNAL_API_KEY`).
3. En el backend (`backend/.env`) define:
   ```env
   INTERNAL_API_KEY="una-cadena-larga-y-aleatoria"
   N8N_SESSION_WEBHOOK_URL="http://localhost:5678/webhook/brote-sesion"
   ```
4. **Activa** ambos workflows (toggle *Active*) y arranca N8N (`n8n start`).

## ✅ Cómo probarlo (en local)

1. Con backend, frontend y N8N arrancados, inicia una sesión **corta** (1 min)
   desde el feed.
2. Cuando la cuenta atrás llegue a cero, pulsa **Completar ✓**.
3. En segundos: salta el **badge del sobre** y en *Mensajes* tienes el MD del
   bot **Brote**: *"📚 ¡Has terminado por hoy…! ¡Felicidades!"*.

> Si N8N está apagado, la app funciona igual (el webhook es *fire-and-forget*);
> simplemente no llega la felicitación.

---

## 🌍 Contra la app desplegada (túnel) — para la demo en producción

La automatización funciona también desde **https://brotes.vercel.app** sin
desplegar N8N: el backend de Render avisa a tu N8N local a través de un túnel.

**Cómo está montado:** en N8N conviven dos variantes del workflow de
felicitación — la local (webhook `/webhook/brote-sesion` → `localhost:3000`) y
la **PROD** (webhook `/webhook/brote-sesion-prod` → el backend de Render, con
la misma `x-api-key`).

**Pasos (≈5 min, repetir si se reinició el túnel):**

1. Arranca N8N: `n8n start`
2. Arranca el túnel en otra terminal y copia la URL `https://….trycloudflare.com`:
   ```powershell
   cloudflared tunnel --url http://localhost:5678
   ```
   *(instalable con `winget install Cloudflare.cloudflared`)*
3. En **Render** → servicio backend → *Environment*:
   - `INTERNAL_API_KEY` = la misma clave de los workflows
   - `N8N_SESSION_WEBHOOK_URL` = `https://<url-del-túnel>/webhook/brote-sesion-prod`

   Al guardar, Render redespliega (~3 min).
4. Prueba: sesión de 1 minuto en la app desplegada → Completar ✓ → MD del bot.

> ⚠️ La URL gratuita de trycloudflare **cambia en cada arranque del túnel**:
> antes de una demo, repite los pasos 2-3. Si el túnel no está corriendo, la
> app de producción funciona igual — solo deja de llegar la felicitación.
