export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'ahora'
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

// Horas restantes hasta que algo expira (para historias).
export function horasRestantes(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.round(ms / 3_600_000))
}
