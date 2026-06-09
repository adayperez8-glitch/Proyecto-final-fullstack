import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { Cargando, ErrorMsg, Vacio } from '../components/ui/States.jsx'
import MoodPicker from '../components/feed/MoodPicker.jsx'
import StartSession from '../components/feed/StartSession.jsx'
import StoriesBar from '../components/feed/StoriesBar.jsx'
import SessionCard from '../components/feed/SessionCard.jsx'
import CountdownRing from '../components/CountdownRing/CountdownRing.jsx'
import s from './Feed.module.css'

export default function Feed() {
  const { usuario } = useAuth()
  const { get, patch } = useApi()

  const [feed, setFeed] = useState([])
  const [stories, setStories] = useState([])
  const [miSesion, setMiSesion] = useState(null)
  const [miMood, setMiMood] = useState(null)
  const [estado, setEstado] = useState('cargando')

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setEstado('cargando')
      try {
        const [f, st, ses, mood] = await Promise.all([
          get('/api/sessions/feed'),
          get('/api/stories/feed'),
          get('/api/sessions/me'),
          get('/api/moods/me'),
        ])
        setFeed(f.feed)
        setStories(st.historias)
        setMiSesion(ses.sesion)
        setMiMood(mood.mood)
        setEstado('ok')
      } catch {
        if (!silencioso) setEstado('error')
      }
    },
    [get],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  // Refresco suave de presencia y nuevas sesiones (la cuenta atrás corre en local).
  useEffect(() => {
    const id = setInterval(() => cargar(true), 15000)
    return () => clearInterval(id)
  }, [cargar])

  const terminar = async () => {
    try {
      await patch(`/api/sessions/${miSesion.id}/complete`)
      cargar(true)
    } catch {
      /* hook */
    }
  }
  const cancelar = async () => {
    try {
      await patch(`/api/sessions/${miSesion.id}/cancel`)
      setMiSesion(null)
      cargar(true)
    } catch {
      /* hook */
    }
  }

  const otros = feed.filter((i) => i.id !== miSesion?.id)

  if (estado === 'cargando') return <Cargando label="Cargando tu jardín…" />
  if (estado === 'error') return <ErrorMsg onRetry={() => cargar()}>No pudimos cargar el feed</ErrorMsg>

  return (
    <div className={s.page}>
      <header className={s.masthead}>
        <p className={s.lede}>
          {otros.length > 0
            ? `${otros.length} ${otros.length === 1 ? 'persona se enfoca' : 'personas se enfocan'} contigo ahora mismo.`
            : 'Abre tu sesión y da ejemplo. Los demás brotarán aquí.'}
        </p>
      </header>

      <StoriesBar stories={stories} me={usuario} onChange={() => cargar(true)} />

      <MoodPicker actual={miMood} onSet={setMiMood} />

      {/* Mi sesión de hoy */}
      {miSesion ? (
        <section className={s.miSesion}>
          <CountdownRing
            startedAt={miSesion.startedAt}
            endsAt={miSesion.endsAt}
            status={miSesion.status}
            goalMinutes={miSesion.goalMinutes}
            size={150}
            stroke={13}
          />
          <div className={s.miInfo}>
            <span className={s.miTipo}>
              {miSesion.type === 'STUDY' ? '📚 Estudiando' : '💻 Trabajando'}
            </span>
            <p className={s.miHint}>Tu cuenta atrás corre a la vista de todos. ¡Ánimo! 🌱</p>
            <div className={s.miBtns}>
              <button className={s.terminar} onClick={terminar}>
                Terminar ✓
              </button>
              <button className={s.cancelar} onClick={cancelar}>
                Cancelar
              </button>
            </div>
          </div>
        </section>
      ) : (
        <StartSession onStart={(ses) => setMiSesion(ses)} />
      )}

      <div className={s.seccionHead}>
        <h2 className={s.seccion}>Enfocándose hoy</h2>
        {otros.length > 0 && <span className={s.count}>{otros.length}</span>}
      </div>
      {otros.length === 0 ? (
        <Vacio emoji="🌙" titulo="Nadie más por ahora">
          Cuando alguien abra su sesión, aparecerá aquí. ¡Empieza tú y da ejemplo!
        </Vacio>
      ) : (
        <div className={s.lista}>
          {otros.map((item) => (
            <SessionCard key={item.id} item={item} me={usuario} />
          ))}
        </div>
      )}
    </div>
  )
}
