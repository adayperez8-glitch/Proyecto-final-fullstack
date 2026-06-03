import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import s from './Auth.module.css'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const userRegex = /^[a-zA-Z0-9_]+$/

export default function Register() {
  const { login } = useAuth()
  const { post, cargando, error } = useApi()
  const navigate = useNavigate()

  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' })
  const [tocado, setTocado] = useState({})

  const errores = {
    displayName: !form.displayName.trim() ? 'Requerido' : null,
    username: !form.username
      ? 'Requerido'
      : form.username.length < 3
        ? 'Mínimo 3 caracteres'
        : !userRegex.test(form.username)
          ? 'Solo letras, números y _'
          : null,
    email: !form.email ? 'Requerido' : !emailRegex.test(form.email) ? 'Email inválido' : null,
    password: !form.password ? 'Requerido' : form.password.length < 6 ? 'Mínimo 6 caracteres' : null,
  }
  const hayErrores = Object.values(errores).some(Boolean)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const onBlur = (e) => setTocado((t) => ({ ...t, [e.target.name]: true }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setTocado({ displayName: true, username: true, email: true, password: true })
    if (hayErrores) return
    try {
      const { usuario, token } = await post('/api/auth/register', form)
      login(usuario, token)
      navigate('/', { replace: true })
    } catch {
      /* mostrado por el hook */
    }
  }

  const campo = (name, label, props = {}) => (
    <div className={`${s.field} ${tocado[name] && errores[name] ? s.invalid : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        value={form[name]}
        onChange={onChange}
        onBlur={onBlur}
        {...props}
      />
      {tocado[name] && errores[name] && <div className={s.errMsg}>{errores[name]}</div>}
    </div>
  )

  return (
    <div className={s.page}>
      <form className={s.card} onSubmit={onSubmit} noValidate>
        <span className={s.kicker}>Únete a Brote</span>
        <h1 className={s.brand}>Brote 🌱</h1>
        <p className={s.tag}>Crea tu cuenta y empieza a florecer.</p>

        {error && <div className={s.banner}>{error}</div>}

        <div className={s.form}>
          {campo('displayName', 'Nombre', { placeholder: 'Ada Lovelace', autoComplete: 'name' })}
          {campo('username', 'Usuario', { placeholder: 'ada_lovelace', autoComplete: 'username' })}
          {campo('email', 'Email', { type: 'email', placeholder: 'ada@brote.app', autoComplete: 'email' })}
          {campo('password', 'Contraseña', {
            type: 'password',
            placeholder: 'mínimo 6 caracteres',
            autoComplete: 'new-password',
          })}

          <button className={s.submit} disabled={cargando}>
            {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </div>

        <p className={s.switch}>
          ¿Ya tienes cuenta? <Link to="/login">Entra</Link>
        </p>
      </form>
    </div>
  )
}
