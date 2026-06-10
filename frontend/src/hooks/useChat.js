import { useState, useCallback, useEffect } from 'react'
import AI_URL from '../config/aiApi.js'

// Clave de localStorage donde recordamos la conversación activa, para que el
// chat sobreviva al cambiar de página o recargar (el historial vive en la BD).
const CID_KEY = 'brote_chat_cid'

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Hook del chat con el agente de IA. Habla con el microservicio Python en
// streaming (la respuesta aparece token a token), con fallback al endpoint
// normal, y gestiona la lista de conversaciones guardadas.
export function useChat() {
  const [mensajes, setMensajes] = useState([]) // { role, content, sources? }
  const [conversationId, setConversationId] = useState(() => localStorage.getItem(CID_KEY))
  const [conversaciones, setConversaciones] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [error, setError] = useState(null)

  // Carga el historial de una conversación desde la BD.
  const cargarHistorial = useCallback(async (cid) => {
    setCargandoHistorial(true)
    try {
      const res = await fetch(`${AI_URL}/api/chat/history/${cid}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('no-historial')
      const datos = await res.json()
      setMensajes(
        (datos.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources || [],
        })),
      )
      setConversationId(cid)
      localStorage.setItem(CID_KEY, cid)
    } catch {
      // La conversación ya no existe (caducó/borrada): empezamos limpia.
      localStorage.removeItem(CID_KEY)
      setConversationId(null)
      setMensajes([])
    } finally {
      setCargandoHistorial(false)
    }
  }, [])

  const cargarConversaciones = useCallback(async () => {
    try {
      const res = await fetch(`${AI_URL}/api/chat/conversations`, { headers: authHeaders() })
      if (!res.ok) return
      const datos = await res.json()
      setConversaciones(datos.conversations || [])
    } catch {
      /* sin red: la lista simplemente no se muestra */
    }
  }, [])

  // Al montar: recupera la conversación guardada y la lista de conversaciones.
  useEffect(() => {
    const cid = localStorage.getItem(CID_KEY)
    if (cid) cargarHistorial(cid)
    cargarConversaciones()
  }, [cargarHistorial, cargarConversaciones])

  // Procesa un bloque SSE ("event: x\ndata: {...}") del stream.
  const parseSSE = (bloque) => {
    let evento = 'message'
    let data = ''
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith('event:')) evento = linea.slice(6).trim()
      else if (linea.startsWith('data:')) data += linea.slice(5).trim()
    }
    let payload = {}
    try {
      payload = JSON.parse(data)
    } catch {
      /* frame sin datos */
    }
    return { evento, payload }
  }

  const enviar = useCallback(
    async (texto) => {
      const limpio = texto.trim()
      if (!limpio || enviando) return

      setError(null)
      setEnviando(true)
      // Optimista: pinta ya el mensaje del usuario.
      setMensajes((prev) => [...prev, { role: 'user', content: limpio }])

      const body = JSON.stringify({ message: limpio, conversation_id: conversationId })
      const headers = { 'Content-Type': 'application/json', ...authHeaders() }

      try {
        const res = await fetch(`${AI_URL}/api/chat/stream`, { method: 'POST', headers, body })
        if (!res.ok || !res.body) {
          // Fallback al endpoint sin streaming (p.ej. proxy que no soporta SSE).
          const r2 = await fetch(`${AI_URL}/api/chat`, { method: 'POST', headers, body })
          const datos = await r2.json().catch(() => null)
          if (!r2.ok) throw new Error(datos?.detail || 'El asistente no pudo responder')
          setConversationId(datos.conversation_id)
          localStorage.setItem(CID_KEY, datos.conversation_id)
          setMensajes((prev) => [
            ...prev,
            { role: 'assistant', content: datos.reply, sources: datos.sources || [] },
          ])
          return
        }

        // Hueco para la respuesta: el texto va creciendo token a token.
        setMensajes((prev) => [...prev, { role: 'assistant', content: '', sources: [] }])
        let recibido = false
        let falloStream = null

        const aplicar = ({ evento, payload }) => {
          if (evento === 'meta' && payload.conversation_id) {
            setConversationId(payload.conversation_id)
            localStorage.setItem(CID_KEY, payload.conversation_id)
          } else if (evento === 'token') {
            recibido = true
            setMensajes((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              next[next.length - 1] = { ...last, content: last.content + (payload.t || '') }
              return next
            })
          } else if (evento === 'done') {
            setMensajes((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              next[next.length - 1] = { ...last, sources: payload.sources || [] }
              return next
            })
          } else if (evento === 'error') {
            falloStream = payload.detail || 'El asistente no pudo responder'
          }
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const bloques = buffer.split('\n\n')
          buffer = bloques.pop() // lo incompleto se queda esperando más bytes
          bloques.filter(Boolean).forEach((b) => aplicar(parseSSE(b)))
        }

        if (falloStream && !recibido) throw new Error(falloStream)
        if (falloStream) setError(falloStream) // hubo respuesta parcial: se conserva
        cargarConversaciones()
      } catch (err) {
        setError(err.message)
        // Revierte el optimista (y el hueco vacío del asistente, si lo hay).
        setMensajes((prev) => {
          const next = [...prev]
          if (next[next.length - 1]?.role === 'assistant' && !next[next.length - 1].content) {
            next.pop()
          }
          if (next[next.length - 1]?.role === 'user') next.pop()
          return next
        })
      } finally {
        setEnviando(false)
      }
    },
    [conversationId, enviando, cargarConversaciones],
  )

  // Empieza una conversación nueva (olvida la actual; la anterior sigue en la BD).
  const nuevaConversacion = useCallback(() => {
    localStorage.removeItem(CID_KEY)
    setConversationId(null)
    setMensajes([])
    setError(null)
  }, [])

  return {
    mensajes,
    enviar,
    enviando,
    error,
    conversationId,
    cargandoHistorial,
    nuevaConversacion,
    conversaciones,
    cargarHistorial,
  }
}
