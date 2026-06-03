import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { Cargando, ErrorMsg } from '../components/ui/States.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import s from './Admin.module.css'

export default function Admin() {
  const { usuario } = useAuth()
  const { get, patch, del } = useApi()
  const [usuarios, setUsuarios] = useState([])
  const [estado, setEstado] = useState('cargando')

  const cargar = useCallback(async () => {
    setEstado('cargando')
    try {
      const { usuarios } = await get('/api/users')
      setUsuarios(usuarios)
      setEstado('ok')
    } catch {
      setEstado('error')
    }
  }, [get])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cambiarRol = async (u) => {
    const role = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    try {
      await patch(`/api/users/${u.id}/role`, { role })
      cargar()
    } catch {
      /* hook */
    }
  }

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.displayName}? Esta acción no se puede deshacer.`)) return
    try {
      await del(`/api/users/${u.id}`)
      cargar()
    } catch {
      /* hook */
    }
  }

  if (estado === 'cargando') return <Cargando label="Cargando panel…" />
  if (estado === 'error') return <ErrorMsg onRetry={cargar}>No pudimos cargar los usuarios</ErrorMsg>

  return (
    <div className={s.page}>
      <h1 className={s.title}>Panel de administración 🛠️</h1>
      <p className={s.sub}>{usuarios.length} usuarios registrados</p>

      <div className={s.list}>
        {usuarios.map((u) => (
          <div key={u.id} className={s.row}>
            <Avatar user={u} size={42} />
            <div className={s.info}>
              <b className={s.name}>
                {u.displayName}
                {u.online && <span className={s.dot} title="conectad@" />}
              </b>
              <span className={s.handle}>
                @{u.username} · {u.email}
              </span>
            </div>
            <span className={`${s.role} ${u.role === 'ADMIN' ? s.admin : ''}`}>{u.role}</span>
            <div className={s.acts}>
              <button onClick={() => cambiarRol(u)} disabled={u.id === usuario.id}>
                {u.role === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
              </button>
              <button className={s.del} onClick={() => eliminar(u)} disabled={u.id === usuario.id}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
