import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat.js'
import { ErrorMsg } from '../components/ui/States.jsx'
import s from './Asistente.module.css'

const SUGERENCIAS = [
  '¿Cómo dejo de procrastinar?',
  '¿Cómo va mi semana de foco?',
  'Dame una técnica para concentrarme',
  'Estoy agobiado con un examen',
]

export default function Asistente() {
  const {
    mensajes,
    enviar,
    enviando,
    error,
    cargandoHistorial,
    nuevaConversacion,
    conversaciones,
    cargarHistorial,
    conversationId,
  } = useChat()
  const [texto, setTexto] = useState('')
  const [verConvs, setVerConvs] = useState(false)
  const finRef = useRef(null)

  // Auto-scroll al último mensaje.
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, enviando])

  const onSubmit = (e) => {
    e.preventDefault()
    enviar(texto)
    setTexto('')
  }

  const abrirConversacion = (cid) => {
    setVerConvs(false)
    if (cid !== conversationId) cargarHistorial(cid)
  }

  const vacio = mensajes.length === 0
  // El "escribiendo…" solo se muestra hasta que llega el primer token del stream.
  const esperandoRespuesta = enviando && mensajes[mensajes.length - 1]?.role === 'user'

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <h1 className={s.title}>🌱 Asistente de foco</h1>
        <p className={s.sub}>
          Pregúntame sobre técnicas de estudio, concentración o tu propio progreso.
        </p>
        <div className={s.headBtns}>
          {!vacio && (
            <button className={s.nueva} onClick={nuevaConversacion} disabled={enviando}>
              ✨ Nueva conversación
            </button>
          )}
          {conversaciones.length > 0 && (
            <button className={s.nueva} onClick={() => setVerConvs((v) => !v)} disabled={enviando}>
              🗂 Conversaciones ({conversaciones.length})
            </button>
          )}
        </div>
        {verConvs && (
          <div className={s.convList}>
            {conversaciones.map((c) => (
              <button
                key={c.id}
                className={`${s.convItem} ${c.id === conversationId ? s.convActiva : ''}`}
                onClick={() => abrirConversacion(c.id)}
              >
                <span className={s.convTitle}>{c.title || 'Conversación'}</span>
                {c.created_at && (
                  <time className={s.convDate}>
                    {new Date(c.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={s.chat}>
        {cargandoHistorial && (
          <div className={s.empty}>
            <div className={s.emptyEmoji}>💬</div>
            <p>Recuperando tu conversación…</p>
          </div>
        )}

        {vacio && !cargandoHistorial && (
          <div className={s.empty}>
            <div className={s.emptyEmoji}>💬</div>
            <p>¿En qué te ayudo hoy? Prueba con:</p>
            <div className={s.chips}>
              {SUGERENCIAS.map((q) => (
                <button key={q} className={s.chip} onClick={() => enviar(q)} disabled={enviando}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} className={m.role === 'user' ? s.rowUser : s.rowBot}>
            <div className={m.role === 'user' ? s.bubbleUser : s.bubbleBot}>
              <p className={s.text}>{m.content}</p>
              {m.sources?.length > 0 && (
                <div className={s.sources}>
                  <span className={s.sourcesLabel}>Fuentes:</span>
                  {m.sources.map((src) => (
                    <span key={src.source} className={s.sourceChip} title={src.source}>
                      📄 {src.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {esperandoRespuesta && (
          <div className={s.rowBot}>
            <div className={`${s.bubbleBot} ${s.typing}`}>
              <span className={s.dot} />
              <span className={s.dot} />
              <span className={s.dot} />
            </div>
          </div>
        )}

        <div ref={finRef} />
      </div>

      {error && (
        <ErrorMsg>{error}</ErrorMsg>
      )}

      <form className={s.inputBar} onSubmit={onSubmit}>
        <input
          className={s.input}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe tu mensaje…"
          maxLength={2000}
          disabled={enviando}
          autoFocus
        />
        <button className={s.send} type="submit" disabled={enviando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}
