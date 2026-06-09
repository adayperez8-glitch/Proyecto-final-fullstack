import { useState, useCallback, useEffect } from 'react'
import AI_URL from '../config/aiApi.js'

// Clave de localStorage donde recordamos la conversación activa, para que el
// chat sobreviva al cambiar de página o recargar (el historial vive en la BD).
const CID_KEY = 'brote_chat_cid'

// Hook del chat con el agente de IA. Habla con el microservicio Python,
// añade el JWT, y centraliza la conversación, la carga y los errores.
export function useChat() {
  const [mensajes, setMensajes] = useState([]) // { role, content, sources? }
  const [conversationId, setConversationId] = useState(() => localStorage.getItem(CID_KEY))
  const [enviando, setEnviando] = useState(false)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [error, setError] = useState(null)

  // Al montar: si había una conversación guardada, recupera su historial de la BD.
  useEffect(() => {
    const cid = localStorage.getItem(CID_KEY)
    if (!cid) return
    let cancelado = false
    setCargandoHistorial(true)
    const token = localStorage.getItem('token')
    fetch(`${AI_URL}/api/chat/history/${cid}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('no-historial')
        return res.json()
      })
      .then((datos) => {
        if (cancelado) return
        setMensajes(
          (datos.messages || []).map((m) => ({
            role: m.role,
            content: m.content,
            sources: m.sources || [],
          })),
        )
      })
      .catch(() => {
        // La conversación ya no existe (caducó/borrada): empezamos limpia.
        if (cancelado) return
        localStorage.removeItem(CID_KEY)
        setConversationId(null)
      })
      .finally(() => {
        if (!cancelado) setCargandoHistorial(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const enviar = useCallback(
    async (texto) => {
      const limpio = texto.trim()
      if (!limpio || enviando) return

      setError(null)
      setEnviando(true)
      // Optimista: pinta ya el mensaje del usuario.
      setMensajes((prev) => [...prev, { role: 'user', content: limpio }])

      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${AI_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: limpio, conversation_id: conversationId }),
        })
        const datos = await res.json().catch(() => null)
        if (!res.ok) throw new Error(datos?.detail || 'El asistente no pudo responder')

        setConversationId(datos.conversation_id)
        localStorage.setItem(CID_KEY, datos.conversation_id)
        setMensajes((prev) => [
          ...prev,
          { role: 'assistant', content: datos.reply, sources: datos.sources || [] },
        ])
      } catch (err) {
        setError(err.message)
        // Revierte el mensaje optimista para que el usuario pueda reintentar.
        setMensajes((prev) => prev.slice(0, -1))
      } finally {
        setEnviando(false)
      }
    },
    [conversationId, enviando],
  )

  // Empieza una conversación nueva (olvida la actual; la anterior sigue en la BD).
  const nuevaConversacion = useCallback(() => {
    localStorage.removeItem(CID_KEY)
    setConversationId(null)
    setMensajes([])
    setError(null)
  }, [])

  return { mensajes, enviar, enviando, error, conversationId, cargandoHistorial, nuevaConversacion }
}
