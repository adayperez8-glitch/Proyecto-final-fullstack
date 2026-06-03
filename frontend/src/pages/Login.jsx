import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import s from './Auth.module.css'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login } = useAuth()
  const { post, cargando, error } = useApi()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [tocado, setTocado] = useState({})

  const errores = {
    email: !form.email ? 'Requerido' : !emailRegex.test(form.email) ? 'Email inválido' : null,
    password: !form.password ? 'Requerido' : null,
  }
  const hayErrores = Object.values(errores).some(Boolean)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const onBlur = (e) => setTocado((t) => ({ ...t, [e.target.name]: true }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setTocado({ email: true, password: true })
    if (hayErrores) return
    try {
      const { usuario, token } = await post('/api/auth/login', form)
      login(usuario, token)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch {
      /* el error se muestra desde el hook */
    }
  }

  return (
    <div className={s.page}>
      <form className={s.card} onSubmit={onSubmit} noValidate>
        <span className={s.kicker}>Bienvenid@ de vuelta</span>
        <h1 className={s.brand}>Brote 🌱</h1>
        <p className={s.tag}>Enfócate en compañía.</p>

        {error && <div className={s.banner}>{error}</div>}

        <div className={s.form}>
          <div className={`${s.field} ${tocado.email && errores.email ? s.invalid : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ada@brote.app"
              value={form.email}
              onChange={onChange}
              onBlur={onBlur}
            />
            {tocado.email && errores.email && <div className={s.errMsg}>{errores.email}</div>}
          </div>

          <div className={`${s.field} ${tocado.password && errores.password ? s.invalid : ''}`}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              onBlur={onBlur}
            />
            {tocado.password && errores.password && (
              <div className={s.errMsg}>{errores.password}</div>
            )}
          </div>

          <button className={s.submit} disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </div>

        <p className={s.switch}>
          ¿Aún no tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
        <p className={s.hint}>Demo: ada@brote.app / password123</p>
      </form>
    </div>
  )
}
