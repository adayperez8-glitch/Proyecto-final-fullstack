# 🤖 Automatizaciones (N8N)

Dos workflows conectados a la API de Brote. Ambos se autentican contra los
endpoints internos con la cabecera `x-api-key` (= `INTERNAL_API_KEY` del backend).

| Workflow | Disparador | Lógica condicional | Qué hace |
|----------|-----------|--------------------|----------|
| [`story-cleanup.json`](story-cleanup.json) | Cron (cada hora) | **IF** `deleted > 0` | Borra las historias que pasaron de 24 h |
| [`mood-coach.json`](mood-coach.json) | Webhook `POST /webhook/brote-mood` | **Switch** (ánimo negativo) + **IF** (ayer fue positivo) | Deja una reacción de apoyo (IA con fallback a plantilla) sobre el ánimo |

---

## 1. Limpieza de historias — `story-cleanup.json`

```
Schedule (cada hora) → HTTP POST /api/maintenance/stories/cleanup → IF (deleted > 0)
                                                                      ├─ sí → registrar limpieza
                                                                      └─ no → nada que borrar
```

El endpoint borra en BD las historias con `expiresAt < now` y devuelve
`{ deleted: N }`. El nodo **IF** ramifica para que solo se notifique/loguee
cuando realmente se borró algo.

## 2. Coach de ánimo — `mood-coach.json`

```
Webhook → Switch(¿negativo?) → IF(¿ayer positivo?) ─┬─ sí → Set "recuperar ánimo de ayer" ─┐
                                                     └─ no → Set "apoyo estándar" ──────────┤
                                                                                            ▼
                                          Code (IA + fallback) → HTTP POST /coach/reaction
```

Cuando alguien fija su ánimo, la API llama al webhook con este payload:

```json
{
  "userId": "...", "displayName": "Ada", "email": "ada@brote.app",
  "moodId": "...", "mood": "FRUSTRADO", "moodNote": "...",
  "category": "negative",
  "previousMood": "MOTIVADO",
  "previousWasPositive": true,
  "previousWasEarlierDay": true
}
```

- El **Switch** deja pasar solo los ánimos `negative` (los positivos se descartan).
- El **IF** elige el mensaje: si ayer fue positivo → *"ayer tuviste un buen día,
  hagamos que ese ánimo vuelva 💪"*; si no → apoyo estándar.
- El nodo **Code** genera el texto con OpenAI y, si falla o no hay clave,
  usa la plantilla (`fallbackText`). Luego se crea una reacción del bot
  **Brote** sobre el ánimo vía `POST /api/maintenance/coach/reaction`.

---

## 🚀 Cómo importar y configurar

1. **Importa** cada `.json` en N8N: *Workflows → ⋮ → Import from File*.
2. En ambos workflows, en los nodos **HTTP Request**, ajusta:
   - La **URL** (`http://localhost:3000` → la URL pública de tu backend).
   - La cabecera **`x-api-key`** → el valor de tu `INTERNAL_API_KEY`.
3. En el backend (`.env`) define:
   ```env
   INTERNAL_API_KEY="una-cadena-larga-y-aleatoria"
   MOOD_COACH_WEBHOOK_URL="https://TU-N8N/webhook/brote-mood"
   ```
   > Usa la **Production URL** del nodo Webhook (no la de test) cuando el
   > workflow esté activo.
4. (Opcional, recomendado) En N8N define la variable de entorno
   `OPENAI_API_KEY` para que el coach genere el texto con IA. Sin ella, el
   workflow sigue funcionando con las plantillas.
   > N8N 2.x bloquea por defecto el acceso a `$env` desde nodos Code
   > ("access to env vars denied"); el nodo lo captura y cae a la plantilla.
   > Para usar la IA, arranca N8N con `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.
5. **Activa** ambos workflows (toggle *Active*).

## ✅ Cómo probarlo

- **Coach:** haz `POST /api/moods` con `{ "mood": "FRUSTRADO" }` (con tu JWT).
  Tras registrar un ánimo negativo, aparece una reacción de **Brote** sobre él.
  Para ver la variante "ayer fue positivo", registra un ánimo positivo un día
  y uno negativo al siguiente (o ajusta los datos del seed).
- **Limpieza:** en el workflow, pulsa *Execute Workflow* para lanzarlo manualmente
  sin esperar al cron.

> ⚠️ Los `x-api-key` de los JSON traen el placeholder
> `REEMPLAZA_POR_TU_INTERNAL_API_KEY`: recuerda sustituirlo tras importar.
