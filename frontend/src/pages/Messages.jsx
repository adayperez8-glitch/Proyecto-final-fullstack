import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { Cargando, ErrorMsg, Vacio } from '../components/ui/States.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import { timeAgo } from '../lib/time.js'
import s from './Messages.module.css'

export default function Messages() {
  const { usuario } = useAuth()
  const { get, post } = useApi()
  const [mensajes, setMensajes] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [activo, setActivo] = useState(null)
  const [texto, setTexto] = useState('')

  const cargar = useCallback(async () => {
    setEstado('cargando')
    try {
      const { mensajes } = await get('/api/messages')
      setMensajes(mensajes)
      setEstado('ok')
    } catch {
      setEstado('error')
    }
  }, [get])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Agrupamos por interlocutor.
  const convs = new Map()
  for (const m of mensajes) {
    const partner = m.from.id === usuario.id ? m.to : m.from
    if (!partner) continue
    if (!convs.has(partner.id)) convs.set(partner.id, { partner, items: [] })
    convs.get(partner.id).items.push(m)
  }
  const lista = [...convs.values()].sort(
    (a, b) => new Date(b.items[0].createdAt) - new Date(a.items[0].createdAt),
  )
  const conv = activo ? convs.get(activo) : null
  const hilo = conv
    ? [...conv.items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : []

  const enviar = async () => {
    if (!texto.trim() || !conv) return
    try {
      await post('/api/messages', { toId: conv.partner.id, text: texto.trim() })
      setTexto('')
      await cargar()
    } catch {
      /* hook */
    }
  }

  if (estado === 'cargando') return <Cargando label="Cargando mensajes…" />
  if (estado === 'error') return <ErrorMsg onRetry={cargar}>No pudimos cargar tus mensajes</ErrorMsg>

  if (conv) {
    return (
      <div className={s.thread}>
        <header className={s.threadHead}>
          <button className={s.back} onClick={() => setActivo(null)} aria-label="Volver">
            ←
          </button>
          <Avatar user={conv.partner} size={38} />
          <b>{conv.partner.displayName}</b>
        </header>

        <div className={s.bubbles}>
          {hilo.map((m) => (
            <div
              key={m.id}
              className={`${s.bubble} ${m.from.id === usuario.id ? s.mine : s.theirs}`}
            >
              {m.storyId && <span className={s.replyTag}>↪ respuesta a historia</span>}
              <span>{m.text}</span>
              <time>{timeAgo(m.createdAt)}</time>
            </div>
          ))}
        </div>

        <div className={s.replyBar}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            maxLength={500}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
          />
          <button onClick={enviar} disabled={!texto.trim()}>
            Enviar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>Mensajes</h1>
      {lista.length === 0 ? (
        <Vacio emoji="✉️" titulo="Sin mensajes aún">
          Responde a una historia o escribe a alguien desde su perfil.
        </Vacio>
      ) : (
        <div className={s.convs}>
          {lista.map(({ partner, items }) => {
            const last = items[0]
            const noLeido = items.some((m) => m.to.id === usuario.id && !m.readAt)
            return (
              <button key={partner.id} className={s.conv} onClick={() => setActivo(partner.id)}>
                <Avatar user={partner} size={48} />
                <span className={s.convInfo}>
                  <b>{partner.displayName}</b>
                  <span className={s.preview}>
                    {last.from.id === usuario.id ? 'Tú: ' : ''}
                    {last.text}
                  </span>
                </span>
                <span className={s.meta}>
                  <time>{timeAgo(last.createdAt)}</time>
                  {noLeido && <span className={s.unread} />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
