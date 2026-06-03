import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import { useApi } from '../../hooks/useApi.js'
import s from './UserResult.module.css'

// Fila de usuario con botón de amistad y nº de amigos en común.
export default function UserResult({ user }) {
  const { post, del } = useApi()
  const [esAmigo, setEsAmigo] = useState(!!user.esAmigo)
  const [busy, setBusy] = useState(false)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    try {
      if (esAmigo) {
        await del(`/api/friends/${user.id}`)
        setEsAmigo(false)
      } else {
        await post('/api/friends', { friendId: user.id })
        setEsAmigo(true)
      }
    } catch {
      /* hook */
    } finally {
      setBusy(false)
    }
  }

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
      <button
        className={`${s.btn} ${esAmigo ? s.amigo : ''}`}
        onClick={toggle}
        disabled={busy}
      >
        {esAmigo ? 'Amigos ✓' : '+ Añadir'}
      </button>
    </div>
  )
}
