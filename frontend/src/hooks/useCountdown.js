import { useState, useEffect } from 'react'
import { remainingMs, progress, colorForProgress, formatHMS } from '../lib/countdown.js'

// Recalcula cada segundo el estado de una cuenta atrás (solo si está activa).
export function useCountdown(startedAt, endsAt, { active = true } = {}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  const remaining = remainingMs(endsAt, now)
  const prog = progress(startedAt, endsAt, now)
  return {
    remaining,
    prog,
    color: colorForProgress(prog),
    done: remaining === 0,
    label: formatHMS(remaining),
  }
}
