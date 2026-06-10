import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useEvents } from '../../context/EventsContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import Avatar from '../ui/Avatar.jsx'
import s from './Layout.module.css'

const linkClass = ({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)

export default function Layout() {
  const { usuario, logout } = useAuth()
  const { subscribe } = useEvents()
  const { get } = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const [noLeidos, setNoLeidos] = useState(0)
  const [solicitudes, setSolicitudes] = useState(0)

  const cargarNoLeidos = useCallback(
    () =>
      get('/api/messages/unread-count')
        .then((d) => setNoLeidos(d.count))
        .catch(() => {}),
    [get],
  )
  const cargarSolicitudes = useCallback(
    () =>
      get('/api/friends/requests')
        .then((d) => setSolicitudes(d.recibidas.length))
        .catch(() => {}),
    [get],
  )

  // Avisos de la navbar (sobre y solicitudes): al cargar, al navegar y en
  // tiempo real vía SSE. El polling queda como red de seguridad espaciada.
  useEffect(() => {
    cargarNoLeidos()
    cargarSolicitudes()
    const id = setInterval(() => {
      cargarNoLeidos()
      cargarSolicitudes()
    }, 60000)
    window.addEventListener('brote:mensajes-leidos', cargarNoLeidos)
    return () => {
      clearInterval(id)
      window.removeEventListener('brote:mensajes-leidos', cargarNoLeidos)
    }
  }, [cargarNoLeidos, cargarSolicitudes, location.pathname])

  useEffect(() => subscribe('message', cargarNoLeidos), [subscribe, cargarNoLeidos])
  useEffect(() => subscribe('friend', cargarSolicitudes), [subscribe, cargarSolicitudes])

  const salir = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.bar}>
          <NavLink to="/" className={s.brand}>
            <span className={s.sprout}>🌱</span> Brote
          </NavLink>

          <nav className={s.nav}>
            <NavLink to="/" end className={linkClass} title="Feed" aria-label="Feed">
              <span className={s.ico}>🏠</span>
            </NavLink>
            <NavLink to="/buscar" className={linkClass} title="Buscar gente" aria-label="Buscar">
              <span className={s.ico}>
                🔍
                {solicitudes > 0 && (
                  <span className={s.badgeNum} aria-label={`${solicitudes} solicitudes de amistad`}>
                    {solicitudes}
                  </span>
                )}
              </span>
            </NavLink>
            <NavLink
              to="/estadisticas"
              className={linkClass}
              title="Mis estadísticas"
              aria-label="Estadísticas"
            >
              <span className={s.ico}>📊</span>
            </NavLink>
            <NavLink to="/mensajes" className={linkClass} title="Mensajes" aria-label="Mensajes">
              <span className={s.ico}>
                ✉️
                {noLeidos > 0 && <span className={s.badge} aria-label={`${noLeidos} sin leer`} />}
              </span>
            </NavLink>
            <NavLink to="/asistente" className={linkClass} title="Asistente IA" aria-label="Asistente IA">
              <span className={s.ico}>🌱</span>
            </NavLink>
            {usuario?.role === 'ADMIN' && (
              <NavLink to="/admin" className={linkClass} title="Admin" aria-label="Admin">
                <span className={s.ico}>⚙️</span>
              </NavLink>
            )}
            <NavLink
              to={`/u/${usuario?.username}`}
              className={linkClass}
              title="Mi perfil"
              aria-label="Mi perfil"
            >
              <Avatar user={usuario} size={30} />
            </NavLink>
            <button className={s.salir} onClick={salir}>
              Salir
            </button>
          </nav>
        </div>
      </header>

      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}
