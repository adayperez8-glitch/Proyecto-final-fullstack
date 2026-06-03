import { useEffect, useState, useCallback } from 'react'
import Avatar from '../ui/Avatar.jsx'
import { Cargando } from '../ui/States.jsx'
import { useApi } from '../../hooks/useApi.js'
import s from './StoryViewer.module.css'

export default function StoryViewer({ storyId, me, onClose }) {
  const { get, post } = useApi()
  const [historia, setHistoria] = useState(null)
  const [texto, setTexto] = useState('')
  const [publico, setPublico] = useState(false)
  const [enviado, setEnviado] = useState(null)

  const cargar = useCallback(() => {
    get(`/api/stories/${storyId}`)
      .then((d) => setHistoria(d.historia))
      .catch(() => {})
  }, [get, storyId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const responder = async () => {
    if (!texto.trim() || !historia) return
    try {
      await post('/api/messages', {
        toId: historia.user.id,
        storyId,
        text: texto.trim(),
        visibility: publico ? 'PUBLIC' : 'PRIVATE',
      })
      setEnviado(publico ? 'pública' : 'privada')
      setTexto('')
      if (publico) cargar()
    } catch {
      /* hook */
    }
  }

  const esMia = me?.id === historia?.user?.id

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <button className={s.close} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {!historia ? (
          <Cargando label="Abriendo historia…" />
        ) : (
          <>
            <div className={s.media} style={{ background: historia.bgColor || '#e8c5b8' }}>
              {historia.imageUrl ? (
                <img src={historia.imageUrl} alt="historia" />
              ) : (
                <p className={s.text}>{historia.text}</p>
              )}
              <div className={s.author}>
                <Avatar user={historia.user} size={30} />
                <b>{historia.user.displayName}</b>
              </div>
            </div>

            {historia.messages?.length > 0 && (
              <div className={s.publicMsgs}>
                {historia.messages.map((m) => (
                  <div key={m.id} className={s.pub}>
                    <b>@{m.from.username}:</b> {m.text}
                  </div>
                ))}
              </div>
            )}

            {esMia ? (
              <p className={s.propia}>Es tu historia 🌱</p>
            ) : (
              <div className={s.replyArea}>
                <div className={s.replyBar}>
                  <input
                    placeholder={`Responder a ${historia.user.displayName.split(' ')[0]}…`}
                    value={texto}
                    maxLength={500}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && responder()}
                  />
                  <button onClick={responder} disabled={!texto.trim()}>
                    Enviar
                  </button>
                </div>
                <label className={s.pubToggle}>
                  <input
                    type="checkbox"
                    checked={publico}
                    onChange={(e) => setPublico(e.target.checked)}
                  />
                  Mostrar a todos (mensaje flotante)
                </label>
                {enviado && (
                  <p className={s.enviado}>
                    ¡Respuesta {enviado} enviada! {publico ? '🌍' : '🔒'}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
