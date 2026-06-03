import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../ui/Avatar.jsx'
import s from './Layout.module.css'

const linkClass = ({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

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
              <span className={s.ico}>✉️</span>
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
