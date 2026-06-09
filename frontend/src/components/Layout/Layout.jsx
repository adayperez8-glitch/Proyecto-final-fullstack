import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import Avatar from '../ui/Avatar.jsx'
import s from './Layout.module.css'

const linkClass = ({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)

export default function Layout() {
  const { usuario, logout } = useAuth()
  const { get } = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const [noLeidos, setNoLeidos] = useState(0)

  // Conteo de mensajes sin leer para el aviso del sobre: al cargar, al navegar
  // (p. ej. al salir de la bandeja ya leída) y cada 20s.
  useEffect(() => {
    let activo = true
    const cargar = () =>
      get('/api/messages/unread-count')
        .then((d) => activo && setNoLeidos(d.count))
        .catch(() => {})
    cargar()
    const id = setInterval(cargar, 20000)
    // La página de mensajes avisa al marcar leídos para refrescar al instante.
    window.addEventListener('brote:mensajes-leidos', cargar)
    return () => {
      activo = false
      clearInterval(id)
      window.removeEventListener('brote:mensajes-leidos', cargar)
    }
  }, [get, location.pathname])

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
              <span className={s.ico}>🔍</span>
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
