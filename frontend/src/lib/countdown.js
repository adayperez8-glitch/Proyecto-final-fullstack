// Espejo en cliente de la lógica de cuenta atrás del backend (mismo contrato).
// El servidor da startedAt y endsAt; el navegador calcula y anima en vivo.

export function remainingMs(endsAt, now = Date.now()) {
  return Math.max(0, new Date(endsAt).getTime() - now)
}

export function progress(startedAt, endsAt, now = Date.now()) {
  const total = new Date(endsAt).getTime() - new Date(startedAt).getTime()
  if (total <= 0) return 1
  const done = now - new Date(startedAt).getTime()
  return Math.min(1, Math.max(0, done / total))
}

// Coral vivo (#e0563b) → salvia verde (#4fa07d) según el progreso.
export function colorForProgress(p) {
  const t = Math.min(1, Math.max(0, p))
  const from = { r: 224, g: 86, b: 59 }
  const to = { r: 79, g: 160, b: 125 }
  const r = Math.round(from.r + (to.r - from.r) * t)
  const g = Math.round(from.g + (to.g - from.g) * t)
  const b = Math.round(from.b + (to.b - from.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export function formatHMS(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
