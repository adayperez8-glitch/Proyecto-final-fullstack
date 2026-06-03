// Lógica pura de la cuenta atrás de una sesión de foco.
// Sin dependencias ni I/O → fácil de testear y de compartir su contrato con el frontend.

const MIN_MS = 60_000

/** Fecha de fin = inicio + objetivo en minutos. */
export function computeEndsAt(startedAt, goalMinutes) {
  return new Date(new Date(startedAt).getTime() + goalMinutes * MIN_MS)
}

/** Milisegundos restantes (nunca negativo). */
export function remainingMs(endsAt, now = new Date()) {
  return Math.max(0, new Date(endsAt).getTime() - new Date(now).getTime())
}

/** Progreso de 0 (recién empieza) a 1 (completado). */
export function progress(startedAt, endsAt, now = new Date()) {
  const total = new Date(endsAt).getTime() - new Date(startedAt).getTime()
  if (total <= 0) return 1
  const done = new Date(now).getTime() - new Date(startedAt).getTime()
  return Math.min(1, Math.max(0, done / total))
}

/**
 * Color que interpola de coral cálido (inicio) a salvia verde (final),
 * en armonía con la paleta marrón/rosa de Brote.
 */
export function colorForProgress(p) {
  const t = Math.min(1, Math.max(0, p))
  const from = { r: 224, g: 122, b: 95 } // coral  #e07a5f
  const to = { r: 129, g: 178, b: 154 } // salvia #81b29a
  const r = Math.round(from.r + (to.r - from.r) * t)
  const g = Math.round(from.g + (to.g - from.g) * t)
  const b = Math.round(from.b + (to.b - from.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

/** ¿La sesión ya llegó a su fin temporal? */
export function isCompleted(endsAt, now = new Date()) {
  return remainingMs(endsAt, now) === 0
}
