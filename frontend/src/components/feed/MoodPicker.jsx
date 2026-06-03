import { useState } from 'react'
import { MOOD_LIST, moodInfo } from '../../lib/moods.js'
import { useApi } from '../../hooks/useApi.js'
import s from './MoodPicker.module.css'

// Permite al usuario fijar su ánimo de hoy.
export default function MoodPicker({ actual, onSet }) {
  const { post, cargando } = useApi()
  const [abierto, setAbierto] = useState(false)
  const [nota, setNota] = useState('')

  const elegir = async (key) => {
    try {
      const { mood } = await post('/api/moods', { mood: key, note: nota.trim() || undefined })
      onSet?.(mood)
      setAbierto(false)
      setNota('')
    } catch {
      /* manejado por el hook */
    }
  }

  const info = actual ? moodInfo(actual.mood) : null

  return (
    <div className={s.box}>
      <button className={s.toggle} onClick={() => setAbierto((v) => !v)} disabled={cargando}>
        {info ? (
          <>
            <span className={s.bigEmoji}>{info.emoji}</span>
            <span>
              Hoy estás <b>{info.label.toLowerCase()}</b>
              {actual.note ? ` · ${actual.note}` : ''}
            </span>
          </>
        ) : (
          <>
            <span className={s.bigEmoji}>🌤️</span>
            <span>¿Cómo te sientes hoy?</span>
          </>
        )}
        <span className={s.chevron}>{abierto ? '▴' : '▾'}</span>
      </button>

      {abierto && (
        <div className={s.panel}>
          <div className={s.grid}>
            {MOOD_LIST.map((m) => (
              <button
                key={m.key}
                className={s.chip}
                style={{ '--mood': m.color }}
                onClick={() => elegir(m.key)}
                disabled={cargando}
              >
                <span className={s.chipEmoji}>{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
          <input
            className={s.nota}
            placeholder="Añade una nota (opcional)…"
            maxLength={140}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
