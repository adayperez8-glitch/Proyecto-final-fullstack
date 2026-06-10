import { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import API_URL from '../config/api'

// Tiempo real: una única conexión SSE (EventSource) por sesión, compartida por
// toda la app. Las páginas se suscriben a tipos de evento ('feed', 'message',
// 'friend') y reaccionan al instante, sin esperar al siguiente polling.
const EventsContext = createContext({ subscribe: () => () => {} })

const EVENT_TYPES = ['feed', 'message', 'friend']

export function EventsProvider({ children }) {
  const { usuario } = useAuth()
  const listenersRef = useRef(new Map()) // tipo -> Set<callback>

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!usuario || !token) return

    // EventSource no permite cabeceras → el token viaja como query param.
    const es = new EventSource(`${API_URL}/api/events?token=${encodeURIComponent(token)}`)
    const handlers = EVENT_TYPES.map((tipo) => {
      const handler = (e) => {
        let data = {}
        try {
          data = JSON.parse(e.data)
        } catch {
          /* evento sin datos */
        }
        listenersRef.current.get(tipo)?.forEach((cb) => cb(data))
      }
      es.addEventListener(tipo, handler)
      return [tipo, handler]
    })

    return () => {
      handlers.forEach(([tipo, handler]) => es.removeEventListener(tipo, handler))
      es.close()
    }
  }, [usuario?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Suscripción a un tipo de evento. Devuelve la función de limpieza, para
  // usarla directamente como retorno de un useEffect.
  const subscribe = useCallback((tipo, cb) => {
    if (!listenersRef.current.has(tipo)) listenersRef.current.set(tipo, new Set())
    listenersRef.current.get(tipo).add(cb)
    return () => listenersRef.current.get(tipo)?.delete(cb)
  }, [])

  return <EventsContext.Provider value={{ subscribe }}>{children}</EventsContext.Provider>
}

export const useEvents = () => useContext(EventsContext)
