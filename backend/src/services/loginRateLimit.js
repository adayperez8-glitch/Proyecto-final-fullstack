// Límite de intentos de login para frenar la fuerza bruta.
// Regla: como máximo 4 intentos FALLIDOS por clave (IP + email) cada 10 minutos.
// Al 5º intento dentro de la ventana se bloquea hasta que el más antiguo expire.
// Un login correcto limpia el contador. El estado vive en memoria (sin dependencias):
// suficiente para este proyecto; en un sistema mayor se usaría Redis.
import { ApiError } from '../utils/ApiError.js'

export const WINDOW_MS = 10 * 60 * 1000 // 10 minutos
export const MAX_ATTEMPTS = 4

// clave -> array de marcas de tiempo (ms) de los intentos fallidos recientes.
const failuresByKey = new Map()

// Devuelve (y deja guardados) solo los fallos dentro de la ventana actual.
function recentFailures(key, now) {
  const recientes = (failuresByKey.get(key) || []).filter((t) => now - t < WINDOW_MS)
  if (recientes.length) failuresByKey.set(key, recientes)
  else failuresByKey.delete(key)
  return recientes
}

// Lanza 429 si la clave ya agotó sus intentos en la ventana. Llamar ANTES de comprobar la contraseña.
export function assertCanAttempt(key, now = Date.now()) {
  const fallos = recentFailures(key, now)
  if (fallos.length >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - fallos[0])) / 1000)
    const minutos = Math.ceil(retryAfterSeconds / 60)
    throw ApiError.tooManyRequests(
      `Demasiados intentos fallidos. Espera ${minutos} minuto(s) antes de volver a intentarlo.`,
      { retryAfterSeconds },
    )
  }
}

// Registra un intento fallido para la clave.
export function recordFailure(key, now = Date.now()) {
  const fallos = recentFailures(key, now)
  fallos.push(now)
  failuresByKey.set(key, fallos)
}

// Login correcto: se borra el historial de fallos de la clave.
export function recordSuccess(key) {
  failuresByKey.delete(key)
}

// Solo para tests: vacía el estado.
export function _reset() {
  failuresByKey.clear()
}
