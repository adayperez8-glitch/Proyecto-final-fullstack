import { ApiError } from '../utils/ApiError.js'

// Límite de frecuencia genérico para endpoints de escritura (anti-spam).
// Ventana deslizante en memoria, igual que el límite de login: suficiente para
// una sola instancia (Render free); en un sistema mayor se usaría Redis.
// Se identifica por usuario autenticado (o IP si aún no lo hay).
export function rateLimit({ windowMs = 60_000, max = 30, mensaje } = {}) {
  const hitsByKey = new Map()

  return (req, _res, next) => {
    const key = req.user?.id || req.ip
    const now = Date.now()
    const recientes = (hitsByKey.get(key) || []).filter((t) => now - t < windowMs)

    if (recientes.length >= max) {
      const retryAfterSeconds = Math.ceil((windowMs - (now - recientes[0])) / 1000)
      return next(
        ApiError.tooManyRequests(
          mensaje || 'Vas demasiado rápido. Espera unos segundos e inténtalo de nuevo.',
          { retryAfterSeconds },
        ),
      )
    }

    recientes.push(now)
    hitsByKey.set(key, recientes)
    // Limpieza perezosa para que el Map no crezca sin límite.
    if (hitsByKey.size > 10_000) {
      for (const [k, ts] of hitsByKey) {
        if (ts.every((t) => now - t >= windowMs)) hitsByKey.delete(k)
      }
    }
    next()
  }
}
