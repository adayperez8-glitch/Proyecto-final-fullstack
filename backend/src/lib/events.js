import { verifyToken } from '../services/token.js'
import { friendIdsOf } from './friendships.js'

// ── Tiempo real con Server-Sent Events (SSE) ─────────────────────
// Cada usuario autenticado mantiene una conexión GET /api/events abierta y el
// servidor le empuja eventos ('feed', 'message', 'friend') cuando pasa algo
// que le afecta. Elegimos SSE sobre WebSockets porque el flujo es
// unidireccional (servidor → cliente) y no necesita dependencias (KISS).

const HEARTBEAT_MS = 25 * 1000 // mantiene viva la conexión a través de proxies

// userId -> Set<res> (un usuario puede tener varias pestañas abiertas)
const clients = new Map()

/** Handler de GET /api/events?token=<jwt>. EventSource no permite cabeceras
 *  personalizadas, por eso el token viaja como query param. */
export function sseHandler(req, res) {
  let payload
  try {
    payload = verifyToken(String(req.query.token || ''))
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
  const userId = payload.sub

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // evita que proxies (nginx/Render) tamponen el stream
  })
  res.flushHeaders?.()
  res.write('retry: 5000\n\n') // si se corta, el navegador reintenta a los 5s

  if (!clients.has(userId)) clients.set(userId, new Set())
  clients.get(userId).add(res)

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS)

  req.on('close', () => {
    clearInterval(heartbeat)
    const set = clients.get(userId)
    if (set) {
      set.delete(res)
      if (set.size === 0) clients.delete(userId)
    }
  })
}

/** Envía un evento a todas las conexiones de un usuario (si está conectado). */
export function sendToUser(userId, type, data = {}) {
  const set = clients.get(userId)
  if (!set) return
  const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of set) res.write(frame)
}

/** Envía un evento a varios usuarios. */
export function sendToMany(userIds, type, data = {}) {
  for (const id of userIds) sendToUser(id, type, data)
}

/** Avisa a los amigos de un usuario (y a él mismo) de un cambio en el feed.
 *  Fire-and-forget: el tiempo real nunca debe romper la petición original. */
export function notifyFriendsOf(userId, type, data = {}) {
  friendIdsOf(userId)
    .then((ids) => sendToMany([...ids, userId], type, data))
    .catch(() => {})
}
