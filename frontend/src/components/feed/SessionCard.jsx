import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import CountdownRing from '../CountdownRing/CountdownRing.jsx'
import MoodBadge from './MoodBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { SUPPORT_EMOJIS } from '../../lib/moods.js'
import { timeAgo } from '../../lib/time.js'
import s from './SessionCard.module.css'

const typeChip = (type, status) => {
  if (status === 'COMPLETED') return { txt: '✓ completó su sesión', cls: 'done' }
  return type === 'STUDY'
    ? { txt: '📚 estudiando', cls: 'study' }
    : { txt: '💻 trabajando', cls: 'work' }
}

export default function SessionCard({ item, me }) {
  const { post } = useApi()
  const [comentarios, setComentarios] = useState(item.comments || [])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [apoyo, setApoyo] = useState(false)
  const [reacciones, setReacciones] = useState(item.mood?.reactions || [])

  const { user, mood } = item
  const esMio = me?.id === user?.id
  const chip = typeChip(item.type, item.status)

  // Reacciones agregadas por emoji: [emoji, nº de apoyos].
  const conteoReacciones = Object.entries(
    reacciones.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1
      return acc
    }, {}),
  )

  const comentar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const { comentario } = await post('/api/comments', { sessionId: item.id, text: texto.trim() })
      setComentarios((c) => [comentario, ...c])
      setTexto('')
    } catch {
      /* hook */
    } finally {
      setEnviando(false)
    }
  }

  const apoyar = async (emoji) => {
    if (!mood) return
    try {
      const { reaccion } = await post('/api/reactions', { moodId: mood.id, emoji })
      // Máximo una reacción por persona: sustituye la propia si ya existía.
      setReacciones((rs) => [...rs.filter((r) => r.from?.id !== me?.id), reaccion])
      setApoyo(false)
    } catch {
      /* hook */
    }
  }

  return (
    <article className={s.card}>
      <header className={s.head}>
        <Link to={`/u/${user.username}`} className={s.who}>
          <Avatar user={user} size={46} ring={item.hasStory} />
          <span className={s.names}>
            <span className={s.name}>
              {user.displayName}
              {user.online && <span className={s.dot} title="conectad@" />}
            </span>
            <span className={s.handle}>@{user.username}</span>
          </span>
        </Link>
        <span className={`${s.chip} ${s[chip.cls]}`}>{chip.txt}</span>
      </header>

      <div className={s.body}>
        <CountdownRing
          startedAt={item.startedAt}
          endsAt={item.endsAt}
          status={item.status}
          goalMinutes={item.goalMinutes}
          size={118}
          stroke={11}
        />

        <div className={s.side}>
          {mood && (
            <div className={s.moodRow}>
              <MoodBadge mood={mood} />

              {conteoReacciones.length > 0 && (
                <div className={s.reacciones}>
                  {conteoReacciones.map(([emoji, n]) => (
                    <span
                      key={emoji}
                      className={s.reaccion}
                      title={`${n} ${n === 1 ? 'persona apoya' : 'personas apoyan'} con ${emoji}`}
                    >
                      <span className={s.reaccionEmoji}>{emoji}</span>
                      <span className={s.reaccionCount}>{n}</span>
                    </span>
                  ))}
                </div>
              )}

              {!esMio && (
                <button className={s.apoyarBtn} onClick={() => setApoyo((v) => !v)}>
                  💌 apoyar
                </button>
              )}
            </div>
          )}

          {apoyo && (
            <div className={s.emojiRow}>
              {SUPPORT_EMOJIS.map((e) => (
                <button key={e} className={s.emoji} onClick={() => apoyar(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Comentarios flotantes sobre la cuenta atrás */}
          <div className={s.floats}>
            {comentarios.length === 0 ? (
              <p className={s.noFloats}>Sé quien le dé el primer ánimo ✨</p>
            ) : (
              comentarios.slice(0, 4).map((c) => (
                <div key={c.id} className={s.float} title={timeAgo(c.createdAt)}>
                  <b>{c.from?.displayName?.split(' ')[0] || c.from?.username}:</b> {c.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <form className={s.commentBar} onSubmit={comentar}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={esMio ? 'Anímate a ti mism@…' : `Anima a ${user.displayName.split(' ')[0]}…`}
          maxLength={140}
        />
        <button disabled={enviando || !texto.trim()}>Enviar</button>
      </form>
    </article>
  )
}
