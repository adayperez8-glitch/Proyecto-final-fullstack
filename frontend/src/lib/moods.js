// Catálogo de estados de ánimo. Las claves coinciden con el enum MoodType del backend.
export const MOODS = {
  MOTIVADO: { emoji: '🔥', label: 'Motivad@', color: '#E07A5F' },
  ENERGICO: { emoji: '⚡', label: 'Con energía', color: '#E9A66B' },
  CONCENTRADO: { emoji: '🎯', label: 'Concentrad@', color: '#7A5240' },
  TRANQUILO: { emoji: '🌿', label: 'Tranquil@', color: '#81B29A' },
  CANSADO: { emoji: '😮‍💨', label: 'Cansad@', color: '#C8A98F' },
  FRUSTRADO: { emoji: '😤', label: 'Frustrad@', color: '#D98A9A' },
  ANSIOSO: { emoji: '😬', label: 'Ansios@', color: '#B98AAE' },
  DESANIMADO: { emoji: '🥀', label: 'Desanimad@', color: '#9C8475' },
}

export const MOOD_LIST = Object.entries(MOODS).map(([key, v]) => ({ key, ...v }))

export const moodInfo = (key) => MOODS[key] || { emoji: '🙂', label: key, color: 'var(--muted)' }

// Emojis de apoyo para reaccionar a un estado de ánimo.
export const SUPPORT_EMOJIS = ['💪', '❤️', '🔥', '🌿', '🙌', '✨']
