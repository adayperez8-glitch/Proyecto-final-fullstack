import { moodInfo } from '../../lib/moods.js'
import s from './MoodBadge.module.css'

export default function MoodBadge({ mood, size = 'md' }) {
  if (!mood) return null
  const info = moodInfo(mood.mood)
  return (
    <span
      className={`${s.badge} ${size === 'sm' ? s.sm : ''}`}
      style={{ '--mood': info.color }}
      title={mood.note || info.label}
    >
      <span className={s.emoji}>{info.emoji}</span>
      <span className={s.label}>{info.label}</span>
    </span>
  )
}
