import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { Cargando, ErrorMsg } from '../components/ui/States.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import CountdownRing from '../components/CountdownRing/CountdownRing.jsx'
import MoodBadge from '../components/feed/MoodBadge.jsx'
import StoryViewer from '../components/feed/StoryViewer.jsx'
import { horasRestantes } from '../lib/time.js'
import s from './Profile.module.css'

export default function Profile() {
  const { username } = useParams()
  const { usuario, actualizarUsuario } = useAuth()
  const { get, patch, post, del, upload } = useApi()

  const [perfil, setPerfil] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ displayName: '', bio: '', avatarUrl: '' })
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const avatarFileRef = useRef(null)
  const [dm, setDm] = useState('')
  const [dmEnviado, setDmEnviado] = useState(false)
  const [viendo, setViendo] = useState(null)
  // Relación con este perfil: 'nada' | 'enviada' | 'recibida' | 'amigos'.
  const [relacion, setRelacion] = useState('nada')
  const [solicitudId, setSolicitudId] = useState(null)

  const esMio = usuario?.username === username

  const cargar = useCallback(async () => {
    setEstado('cargando')
    try {
      const { perfil } = await get(`/api/users/${username}`)
      setPerfil(perfil)
      setRelacion(
        perfil.esAmigo
          ? 'amigos'
          : perfil.solicitudRecibida
            ? 'recibida'
            : perfil.solicitudEnviada
              ? 'enviada'
              : 'nada',
      )
      setSolicitudId(perfil.solicitudId || null)
      setForm({ displayName: perfil.displayName, bio: perfil.bio || '', avatarUrl: perfil.avatarUrl || '' })
      setEstado('ok')
    } catch {
      setEstado('error')
    }
  }, [get, username])

  useEffect(() => {
    cargar()
    setDmEnviado(false)
    setEditando(false)
  }, [cargar])

  const guardar = async () => {
    try {
      const { usuario: actualizado } = await patch('/api/users/me', {
        displayName: form.displayName,
        bio: form.bio,
        avatarUrl: form.avatarUrl || undefined,
      })
      actualizarUsuario(actualizado)
      setPerfil((p) => ({ ...p, ...actualizado }))
      setEditando(false)
    } catch {
      /* hook */
    }
  }

  // Sube una foto desde la galería y la deja lista como avatar (se persiste al Guardar).
  const elegirAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reelegir el mismo archivo
    if (!file) return
    setSubiendoAvatar(true)
    try {
      const { url } = await upload('/api/users/me/avatar', file)
      setForm((f) => ({ ...f, avatarUrl: url }))
    } catch {
      /* hook */
    } finally {
      setSubiendoAvatar(false)
    }
  }

  const enviarDm = async () => {
    if (!dm.trim()) return
    try {
      await post('/api/messages', { toId: perfil.id, text: dm.trim() })
      setDm('')
      setDmEnviado(true)
    } catch {
      /* hook */
    }
  }

  // Acciones de amistad. Al hacernos amigos (o dejar de serlo) recargamos el
  // perfil: el contenido visible (historias, sesión, ánimo) cambia con la relación.
  const accionAmistad = async () => {
    try {
      if (relacion === 'amigos') {
        await del(`/api/friends/${perfil.id}`)
        await cargar()
      } else if (relacion === 'enviada') {
        await del(`/api/friends/requests/${solicitudId}`)
        setRelacion('nada')
        setSolicitudId(null)
      } else if (relacion === 'recibida') {
        await patch(`/api/friends/requests/${solicitudId}/accept`)
        await cargar()
      } else {
        const d = await post('/api/friends/requests', { toId: perfil.id })
        if (d.esAmigo) {
          await cargar() // aceptación mutua: ya somos amigos
        } else {
          setRelacion('enviada')
          setSolicitudId(d.solicitudId)
        }
      }
    } catch {
      /* hook */
    }
  }

  const textoBoton = {
    nada: '+ Añadir amig@',
    enviada: 'Pendiente…',
    recibida: 'Aceptar solicitud ✓',
    amigos: 'Amigos ✓',
  }[relacion]

  if (estado === 'cargando') return <Cargando label="Cargando perfil…" />
  if (estado === 'error') return <ErrorMsg onRetry={cargar}>No encontramos a @{username}</ErrorMsg>

  return (
    <div className={s.page}>
      <header className={s.head}>
        <Avatar user={perfil} size={88} ring={perfil.historias?.length > 0} />
        <div className={s.info}>
          <h1 className={s.name}>
            {perfil.displayName}
            {perfil.online && <span className={s.online}>● en línea</span>}
          </h1>
          <span className={s.handle}>@{perfil.username}</span>
          <span className={s.stats}>
            <b>{perfil.numAmigos ?? 0}</b> amig@s
            {perfil.amigosEnComun > 0 && (
              <span className={s.comun}> · {perfil.amigosEnComun} en común</span>
            )}
          </span>
          {perfil.bio && <p className={s.bio}>{perfil.bio}</p>}
          {perfil.role === 'ADMIN' && <span className={s.admin}>admin</span>}
        </div>
      </header>

      {esMio ? (
        <div className={s.acciones}>
          <button className={s.editar} onClick={() => setEditando((v) => !v)}>
            {editando ? 'Cerrar edición' : '✏️ Editar perfil'}
          </button>
          <Link to="/estadisticas" className={s.statsLink}>
            📊 Mis estadísticas
          </Link>
        </div>
      ) : (
        <div className={s.acciones}>
          <button
            className={`${s.amigoBtn} ${relacion === 'amigos' ? s.esAmigo : ''} ${relacion === 'enviada' ? s.pendiente : ''}`}
            onClick={accionAmistad}
          >
            {textoBoton}
          </button>
        </div>
      )}

      {/* Contenido oculto por privacidad: solo los amigos ven su actividad. */}
      {!esMio && perfil.privado && (
        <div className={s.privado}>
          🔒 Solo sus amig@s ven sus historias, su sesión y su ánimo.
          {relacion === 'nada' && ' Envíale una solicitud para conectar.'}
        </div>
      )}

      {!esMio && (
        <div className={s.dmBox}>
          <input
            placeholder={`Mensaje privado a ${perfil.displayName.split(' ')[0]}…`}
            value={dm}
            maxLength={500}
            onChange={(e) => setDm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarDm()}
          />
          <button onClick={enviarDm} disabled={!dm.trim()}>
            Enviar
          </button>
        </div>
      )}
      {dmEnviado && <p className={s.ok}>¡Mensaje enviado! 💌</p>}

      {editando && (
        <div className={s.editForm}>
          <label>
            Nombre
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </label>
          <label>
            Bio
            <textarea
              value={form.bio}
              maxLength={160}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </label>
          <div className={s.avatarField}>
            <span className={s.avatarLabel}>Foto de perfil</span>
            <div className={s.avatarUpload}>
              <Avatar user={{ ...perfil, avatarUrl: form.avatarUrl }} size={64} />
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={elegirAvatar}
              />
              <button
                type="button"
                className={s.avatarBtn}
                onClick={() => avatarFileRef.current?.click()}
                disabled={subiendoAvatar}
              >
                {subiendoAvatar ? 'Subiendo…' : form.avatarUrl ? '🔄 Cambiar foto' : '🖼️ Subir foto'}
              </button>
            </div>
          </div>
          <button className={s.guardar} onClick={guardar}>
            Guardar
          </button>
        </div>
      )}

      {perfil.sesionActiva && (
        <section className={s.sesion}>
          <CountdownRing
            startedAt={perfil.sesionActiva.startedAt}
            endsAt={perfil.sesionActiva.endsAt}
            status={perfil.sesionActiva.status}
            goalMinutes={perfil.sesionActiva.goalMinutes}
            size={120}
            stroke={11}
          />
          <div>
            <span className={s.sesionTipo}>
              {perfil.sesionActiva.type === 'STUDY' ? '📚 Estudiando' : '💻 Trabajando'}
            </span>
            {perfil.mood && (
              <div className={s.moodWrap}>
                <MoodBadge mood={perfil.mood} />
              </div>
            )}
          </div>
        </section>
      )}

      {!perfil.sesionActiva && perfil.mood && (
        <div className={s.moodSolo}>
          <MoodBadge mood={perfil.mood} />
        </div>
      )}

      {perfil.historias?.length > 0 && (
        <section>
          <h2 className={s.seccion}>Historias</h2>
          <div className={s.historias}>
            {perfil.historias.map((h) => (
              <button
                key={h.id}
                className={s.historia}
                style={{ background: h.bgColor || '#e8c5b8' }}
                onClick={() => setViendo(h.id)}
              >
                {h.imageUrl ? <img src={h.imageUrl} alt="historia" /> : <span>{h.text}</span>}
                <small>{horasRestantes(h.expiresAt)}h</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {viendo && <StoryViewer storyId={viendo} me={usuario} onClose={() => setViendo(null)} />}
    </div>
  )
}
