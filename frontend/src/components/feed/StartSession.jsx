import { useState } from 'react'
import { useApi } from '../../hooks/useApi.js'
import s from './StartSession.module.css'

const PRESETS = [
  { label: '25 min', min: 25 },
  { label: '1 h', min: 60 },
  { label: '2 h', min: 120 },
  { label: '4 h', min: 240 },
  { label: '8 h', min: 480 },
]

export default function StartSession({ onStart }) {
  const { post, cargando, error } = useApi()
  const [type, setType] = useState('STUDY')
  const [min, setMin] = useState(60)

  const iniciar = async () => {
    try {
      const { sesion } = await post('/api/sessions', { type, goalMinutes: Number(min) })
      onStart?.(sesion)
    } catch {
      /* manejado por el hook */
    }
  }

  return (
    <div className={s.card}>
      <h2 className={s.title}>¿En qué te enfocas hoy?</h2>

      <div className={s.types}>
        <button
          className={`${s.type} ${type === 'STUDY' ? s.typeActive : ''}`}
          onClick={() => setType('STUDY')}
        >
          📚 Estudiar
        </button>
        <button
          className={`${s.type} ${type === 'WORK' ? s.typeActive : ''}`}
          onClick={() => setType('WORK')}
        >
          💻 Trabajar
        </button>
      </div>

      <div className={s.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.min}
            className={`${s.preset} ${min === p.min ? s.presetActive : ''}`}
            onClick={() => setMin(p.min)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={s.custom}>
        <label htmlFor="min">o personaliza:</label>
        <input
          id="min"
          type="number"
          min={1}
          max={720}
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <span>min</span>
      </div>

      {error && <p className={s.err}>{error}</p>}

      <button className={s.start} onClick={iniciar} disabled={cargando}>
        {cargando ? 'Empezando…' : 'Empezar sesión 🌱'}
      </button>
    </div>
  )
}
