// Lógica pura de estadísticas de foco (rachas y minutos por día).
// Sin dependencias ni I/O → fácil de testear, igual que utils/countdown.js.

const DAY_MS = 24 * 60 * 60 * 1000

/** Clave de día local con formato YYYY-MM-DD. */
export function dayKey(date) {
  const d = new Date(date)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Rachas de días consecutivos con al menos una sesión completada.
 * - actual: cuenta hacia atrás desde hoy; si hoy aún no hay sesión, la racha
 *   de ayer sigue viva (no se rompe hasta que el día termina sin sesión).
 * - mejor: la racha más larga de toda la historia.
 */
export function computeStreaks(completedDates, now = new Date()) {
  const days = new Set(completedDates.map((d) => startOfDay(d)))

  let mejor = 0
  for (const day of days) {
    if (days.has(day - DAY_MS)) continue // no es inicio de racha
    let len = 1
    while (days.has(day + len * DAY_MS)) len++
    if (len > mejor) mejor = len
  }

  let cursor = startOfDay(now)
  if (!days.has(cursor)) cursor -= DAY_MS
  let actual = 0
  while (days.has(cursor)) {
    actual++
    cursor -= DAY_MS
  }

  return { actual, mejor }
}

// Construye `count` días seguidos desde `firstDay` y reparte las sesiones.
function fillDays(firstDay, count, sessions) {
  const out = []
  for (let i = 0; i < count; i++) {
    const day = new Date(firstDay)
    day.setDate(firstDay.getDate() + i)
    out.push({ fecha: dayKey(day), minutos: 0, sesiones: 0 })
  }
  const index = new Map(out.map((o, i) => [o.fecha, i]))
  for (const s of sessions) {
    const i = index.get(dayKey(s.completedAt))
    if (i !== undefined) {
      out[i].minutos += s.goalMinutes
      out[i].sesiones += 1
    }
  }
  return out
}

/**
 * Minutos y sesiones completadas por día, para los últimos `days` días
 * (del más antiguo al más reciente, rellenando con ceros los días vacíos).
 * Cada sesión debe tener { completedAt, goalMinutes }.
 */
export function minutesByDay(sessions, days = 7, now = new Date()) {
  const base = new Date(now)
  base.setHours(0, 0, 0, 0)
  const first = new Date(base)
  first.setDate(base.getDate() - (days - 1))
  return fillDays(first, days, sessions)
}

/**
 * La semana de calendario ACTUAL, siempre de lunes a domingo (los días que
 * aún no han llegado van con ceros). Para la gráfica semanal.
 */
export function weekByDay(sessions, now = new Date()) {
  const base = new Date(now)
  base.setHours(0, 0, 0, 0)
  const lunes = new Date(base)
  lunes.setDate(base.getDate() - ((base.getDay() + 6) % 7)) // getDay(): 0=domingo
  return fillDays(lunes, 7, sessions)
}
