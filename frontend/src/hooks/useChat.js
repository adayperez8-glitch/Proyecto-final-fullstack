import { useState, useCallback } from 'react'
import AI_URL from '../config/aiApi.js'

// Hook del chat con el agente de IA. Habla con el microservicio Python,
// añade el JWT, y centraliza la conversación, la carga y los errores.
export function useChat() {
  const [mensajes, setMensajes] = useState([]) // { role, content, sources? }
  const [conversationId, setConversationId] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

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

  return { mensajes, enviar, enviando, error, conversationId }
}
