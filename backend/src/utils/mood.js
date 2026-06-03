// Clasificación de estados de ánimo y utilidades para el "coach de ánimo".
// Cuando alguien registra un ánimo, la API avisa a un workflow de N8N; este
// usa estos datos para decidir (Switch/IF) si deja un mensaje de apoyo y cuál.

export const POSITIVE_MOODS = ['MOTIVADO', 'ENERGICO', 'CONCENTRADO', 'TRANQUILO']
export const NEGATIVE_MOODS = ['CANSADO', 'FRUSTRADO', 'ANSIOSO', 'DESANIMADO']

// 'positive' | 'negative' | 'neutral' (por si en el futuro hay ánimos sin clasificar).
export function moodCategory(mood) {
  if (POSITIVE_MOODS.includes(mood)) return 'positive'
  if (NEGATIVE_MOODS.includes(mood)) return 'negative'
  return 'neutral'
}

export const isPositive = (mood) => moodCategory(mood) === 'positive'
export const isNegative = (mood) => moodCategory(mood) === 'negative'

// ¿Dos fechas caen en el mismo día de calendario? Sirve para el mensaje
// "ayer tuviste un buen día...": el ánimo previo debe ser de un día anterior.
export function isSameDay(a, b) {
  if (!a || !b) return false
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}
