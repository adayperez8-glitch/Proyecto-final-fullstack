import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import { useApi } from '../../hooks/useApi.js'
import s from './UserResult.module.css'

// Estado de la relación a partir de los campos que manda la API.
const estadoInicial = (user) => {
  if (user.esAmigo) return 'amigos'
  if (user.solicitudRecibida) return 'recibida'
  if (user.solicitudEnviada) return 'enviada'
  return 'nada'
}

// Fila de usuario con el botón de amistad (ahora con solicitud + aceptación)
// y nº de amigos en común.
export default function UserResult({ user, onChange }) {
  const { post, patch, del } = useApi()
  const [estado, setEstado] = useState(() => estadoInicial(user))
  const [solicitudId, setSolicitudId] = useState(user.solicitudId || null)
  const [busy, setBusy] = useState(false)

  const accion = async (fn) => {
    setBusy(true)
    try {
      await fn()
      onChange?.()
    } catch {
      /* hook */
    } finally {
      setBusy(false)
    }
  }

  const solicitar = () =>
    accion(async () => {
      const d = await post('/api/friends/requests', { toId: user.id })
      if (d.esAmigo) {
        setEstado('amigos') // ya me había solicitado: aceptación mutua
      } else {
        setSolicitudId(d.solicitudId)
        setEstado('enviada')
      }
    })

  const cancelar = () =>
    accion(async () => {
      await del(`/api/friends/requests/${solicitudId}`)
      setEstado('nada')
    })

  const aceptar = () =>
    accion(async () => {
      await patch(`/api/friends/requests/${solicitudId}/accept`)
      setEstado('amigos')
    })

  const dejarDeSerAmigos = () =>
    accion(async () => {
      await del(`/api/friends/${user.id}`)
      setEstado('nada')
    })

  return (
    <div className={s.row}>
      <Link to={`/u/${user.username}`} className={s.who}>
        <Avatar user={user} size={50} />
        <span className={s.info}>
          <b className={s.name}>
            {user.displayName}
            {user.online && <span className={s.dot} title="conectad@" />}
          </b>
          <span className={s.meta}>
            @{user.username}
            {user.amigosEnComun > 0 && (
              <span className={s.mutual}>
                {' · '}
                {user.amigosEnComun} en común
              </span>
            )}
          </span>
        </span>
      </Link>

      {estado === 'nada' && (
        <button className={s.btn} onClick={solicitar} disabled={busy}>
          + Añadir
        </button>
      )}
      {estado === 'enviada' && (
        <button
          className={`${s.btn} ${s.pendiente}`}
          onClick={cancelar}
          disabled={busy}
          title="Cancelar solicitud"
        >
          Pendiente…
        </button>
      )}
      {estado === 'recibida' && (
        <button className={`${s.btn} ${s.aceptar}`} onClick={aceptar} disabled={busy}>
          Aceptar ✓
        </button>
      )}
      {estado === 'amigos' && (
        <button
          className={`${s.btn} ${s.amigo}`}
          onClick={dejarDeSerAmigos}
          disabled={busy}
          title="Dejar de ser amigos"
        >
          Amigos ✓
        </button>
      )}
    </div>
  )
}
