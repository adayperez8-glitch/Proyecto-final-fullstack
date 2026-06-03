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
  const { mensajes, enviar, enviando, error } = useChat()
  const [texto, setTexto] = useState('')
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

  const vacio = mensajes.length === 0

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <h1 className={s.title}>🌱 Asistente de foco</h1>
        <p className={s.sub}>
          Pregúntame sobre técnicas de estudio, concentración o tu propio progreso.
        </p>
      </header>

      <div className={s.chat}>
        {vacio && (
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

        {enviando && (
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
