import { useCountdown } from '../../hooks/useCountdown.js'
import s from './CountdownRing.module.css'

// Anillo SVG de progreso. Late mientras corre y vira de coral a salvia.
export default function CountdownRing({
  startedAt,
  endsAt,
  status,
  goalMinutes,
  size = 132,
  stroke = 12,
}) {
  const active = status === 'ACTIVE'
  const { prog, color, done, label } = useCountdown(startedAt, endsAt, { active })
  const completed = status === 'COMPLETED' || done

  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const shown = completed ? 1 : prog
  const offset = circ * (1 - shown)
  const ringColor = completed ? 'var(--sage)' : color

  return (
    <div
      className={`${s.wrap} ${active && !completed ? s.live : ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={s.svg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--line)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={s.progress}
        />
      </svg>

      <div className={s.center}>
        {completed ? (
          <>
            <span className={s.check}>✓</span>
            <span className={`${s.sub} ${s.subDone}`}>completado</span>
          </>
        ) : (
          <>
            <span className={s.time} style={{ color: ringColor }}>
              {label}
            </span>
            <span className={s.sub}>{goalMinutes ? `de ${formatGoal(goalMinutes)}` : 'restante'}</span>
          </>
        )}
      </div>
    </div>
  )
}

function formatGoal(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}
