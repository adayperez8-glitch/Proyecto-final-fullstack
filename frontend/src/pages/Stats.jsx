import { useEffect, useState, useCallback } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Cargando, ErrorMsg, Vacio } from '../components/ui/States.jsx'
import { moodInfo } from '../lib/moods.js'
import s from './Stats.module.css'

// El jardín: cada día es una parcela y la planta crece con los minutos de foco.
const plantaDelDia = (minutos) => {
  if (minutos === 0) return null
  if (minutos < 60) return '🌱'
  if (minutos < 180) return '🌿'
  if (minutos < 360) return '🌺'
  return '🌳'
}

const formatoMin = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const diaSemana = (fecha) => {
  // fecha viene como YYYY-MM-DD; el índice de DIAS empieza en lunes.
  const d = new Date(`${fecha}T00:00:00`)
  return DIAS[(d.getDay() + 6) % 7]
}

export default function Stats() {
  const { get } = useApi()
  const [stats, setStats] = useState(null)
  const [estado, setEstado] = useState('cargando')

  const cargar = useCallback(async () => {
    setEstado('cargando')
    try {
      const { stats } = await get('/api/stats/me')
      setStats(stats)
      setEstado('ok')
    } catch {
      setEstado('error')
    }
  }, [get])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (estado === 'cargando') return <Cargando label="Regando el jardín…" />
  if (estado === 'error') return <ErrorMsg onRetry={cargar}>No pudimos cargar tus estadísticas</ErrorMsg>

  const maxSemana = Math.max(...stats.semana.map((d) => d.minutos), 1)
  const totalTipo = stats.porTipo.STUDY + stats.porTipo.WORK
  const pctEstudio = totalTipo ? Math.round((stats.porTipo.STUDY / totalTipo) * 100) : 0
  const sinDatos = stats.totalSesiones === 0

  return (
    <div className={s.page}>
      <header className={s.masthead}>
        <span className="kicker">Tu progreso</span>
        <h1 className={s.title}>Mi jardín de foco</h1>
      </header>

      {sinDatos ? (
        <Vacio emoji="🌰" titulo="Tu jardín está por brotar">
          Completa tu primera sesión de foco y aquí crecerá tu primera planta.
        </Vacio>
      ) : (
        <>
          {/* Rachas y totales */}
          <div className={s.cards}>
            <div className={`${s.card} ${stats.rachaActual > 0 ? s.cardFuego : ''}`}>
              <span className={s.cardNum}>
                {stats.rachaActual > 0 ? '🔥' : '🌙'} {stats.rachaActual}
              </span>
              <span className={s.cardLabel}>
                {stats.rachaActual === 1 ? 'día de racha' : 'días de racha'}
              </span>
            </div>
            <div className={s.card}>
              <span className={s.cardNum}>🏆 {stats.mejorRacha}</span>
              <span className={s.cardLabel}>mejor racha</span>
            </div>
            <div className={s.card}>
              <span className={s.cardNum}>{stats.totalSesiones}</span>
              <span className={s.cardLabel}>sesiones completadas</span>
            </div>
            <div className={s.card}>
              <span className={s.cardNum}>{formatoMin(stats.totalMinutos)}</span>
              <span className={s.cardLabel}>de foco total</span>
            </div>
          </div>

          {/* Gráfica de la semana */}
          <section>
            <h2 className={s.seccion}>Esta semana</h2>
            <div className={s.chart} role="img" aria-label="Minutos de foco por día de la última semana">
              {stats.semana.map((d) => (
                <div key={d.fecha} className={s.col}>
                  <span className={s.colMin}>{d.minutos > 0 ? formatoMin(d.minutos) : ''}</span>
                  <div className={s.barWrap}>
                    <div
                      className={s.bar}
                      style={{ height: `${Math.max((d.minutos / maxSemana) * 100, d.minutos > 0 ? 8 : 0)}%` }}
                      title={`${d.fecha}: ${formatoMin(d.minutos)}`}
                    />
                  </div>
                  <span className={s.colDia}>{diaSemana(d.fecha)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Estudio vs trabajo */}
          <section>
            <h2 className={s.seccion}>Estudio · Trabajo</h2>
            <div className={s.split}>
              <div className={s.splitBar}>
                <div className={s.splitStudy} style={{ width: `${pctEstudio}%` }} />
              </div>
              <div className={s.splitLabels}>
                <span>📚 {formatoMin(stats.porTipo.STUDY)}</span>
                <span>💻 {formatoMin(stats.porTipo.WORK)}</span>
              </div>
            </div>
          </section>

          {/* El jardín: últimas 4 semanas */}
          <section>
            <h2 className={s.seccion}>El jardín (últimas 4 semanas)</h2>
            <p className={s.leyenda}>
              Cada parcela es un día: 🌱 &lt;1h · 🌿 1-3h · 🌺 3-6h · 🌳 +6h
            </p>
            <div className={s.garden} role="img" aria-label="Jardín: una planta por cada día con foco">
              {stats.mes.map((d) => {
                const planta = plantaDelDia(d.minutos)
                return (
                  <div
                    key={d.fecha}
                    className={`${s.plot} ${planta ? s.plotVivo : ''}`}
                    title={`${d.fecha}: ${d.minutos > 0 ? formatoMin(d.minutos) : 'sin foco'}`}
                  >
                    {planta || <span className={s.tierra}>·</span>}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {/* Ánimos recientes */}
      {stats.animos.length > 0 && (
        <section>
          <h2 className={s.seccion}>Tus últimos ánimos</h2>
          <div className={s.animos}>
            {stats.animos.map((a, i) => {
              const info = moodInfo(a.mood)
              return (
                <span key={i} className={s.animo} style={{ borderColor: info.color }} title={info.label}>
                  {info.emoji} <small>{info.label}</small>
                </span>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
