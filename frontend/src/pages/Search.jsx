import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../hooks/useApi.js'
import { useEvents } from '../context/EventsContext.jsx'
import { Cargando, Vacio } from '../components/ui/States.jsx'
import UserResult from '../components/social/UserResult.jsx'
import s from './Search.module.css'

export default function Search() {
  const { get } = useApi()
  const { subscribe } = useEvents()
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [recs, setRecs] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [cargandoRecs, setCargandoRecs] = useState(true)

  // Recomendaciones (amigos de amigos) al entrar.
  useEffect(() => {
    get('/api/users/recommendations')
      .then((d) => setRecs(d.usuarios))
      .catch(() => {})
      .finally(() => setCargandoRecs(false))
  }, [get])

  // Solicitudes de amistad recibidas: al entrar y en tiempo real (SSE).
  const cargarSolicitudes = useCallback(
    () =>
      get('/api/friends/requests')
        .then((d) => setSolicitudes(d.recibidas))
        .catch(() => {}),
    [get],
  )
  useEffect(() => {
    cargarSolicitudes()
  }, [cargarSolicitudes])
  useEffect(() => subscribe('friend', cargarSolicitudes), [subscribe, cargarSolicitudes])

  // Búsqueda con debounce de 300 ms.
  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const id = setTimeout(async () => {
      try {
        const d = await get(`/api/users/search?q=${encodeURIComponent(term)}`)
        setResultados(d.usuarios)
      } catch {
        /* hook */
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(id)
  }, [q, get])

  const hayBusqueda = q.trim().length > 0

  return (
    <div className={s.page}>
      <header className={s.masthead}>
        <span className="kicker">Comunidad</span>
        <h1 className={s.title}>Buscar gente</h1>
      </header>

      <div className={s.searchBar}>
        <span className={s.lupa} aria-hidden="true">
          🔍
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca por nombre o @usuario…"
          aria-label="Buscar usuarios"
        />
        {q && (
          <button className={s.clear} onClick={() => setQ('')} aria-label="Limpiar">
            ✕
          </button>
        )}
      </div>

      {hayBusqueda ? (
        buscando ? (
          <Cargando label="Buscando…" />
        ) : resultados.length === 0 ? (
          <Vacio emoji="🔍" titulo="Sin resultados">
            No encontramos a nadie con “{q}”. Prueba con otro nombre.
          </Vacio>
        ) : (
          <div className={s.list}>
            {resultados.map((u) => (
              <UserResult key={u.id} user={u} />
            ))}
          </div>
        )
      ) : (
        <>
          {solicitudes.length > 0 && (
            <section>
              <div className={s.seccionHead}>
                <h2 className={s.seccion}>Solicitudes de amistad</h2>
                <span className={s.hint}>
                  {solicitudes.length === 1 ? 'quiere conectar contigo' : 'quieren conectar contigo'}
                </span>
              </div>
              <div className={s.list}>
                {solicitudes.map((r) => (
                  <UserResult
                    key={r.id}
                    user={{ ...r.de, solicitudRecibida: true, solicitudId: r.id }}
                    onChange={cargarSolicitudes}
                  />
                ))}
              </div>
            </section>
          )}

        <section>
          <div className={s.seccionHead}>
            <h2 className={s.seccion}>Quizá conozcas</h2>
            <span className={s.hint}>amigos de tus amigos</span>
          </div>
          {cargandoRecs ? (
            <Cargando label="Buscando conexiones…" />
          ) : recs.length === 0 ? (
            <Vacio emoji="🌱" titulo="Aún no hay sugerencias">
              Añade amig@s y te recomendaremos gente que quizá conozcas.
            </Vacio>
          ) : (
            <div className={s.list}>
              {recs.map((u) => (
                <UserResult key={u.id} user={u} onChange={cargarSolicitudes} />
              ))}
            </div>
          )}
        </section>
        </>
      )}
    </div>
  )
}
