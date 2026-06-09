import { useState, useCallback } from 'react'
import API_URL from '../config/api'

// Hook para hablar con la API: añade el token JWT, serializa JSON y centraliza
// los estados de carga y error. Devuelve atajos get/post/patch/del.
export function useApi() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const peticion = useCallback(async (endpoint, { method = 'GET', body, ...rest } = {}) => {
    setCargando(true)
    setError(null)
    const token = localStorage.getItem('token')
    // FormData (subida de archivos): el navegador pone el Content-Type con su
    // boundary, así que no lo fijamos ni serializamos a JSON.
    const esFormData = body instanceof FormData

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: esFormData ? body : JSON.stringify(body) } : {}),
        ...rest,
      })

      const datos = res.status === 204 ? null : await res.json().catch(() => null)
      if (!res.ok) {
        const err = new Error((datos && datos.error) || 'Algo salió mal')
        err.details = datos?.details
        err.status = res.status
        throw err
      }
      return datos
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setCargando(false)
    }
  }, [])

  const get = useCallback((e) => peticion(e), [peticion])
  const post = useCallback((e, body) => peticion(e, { method: 'POST', body }), [peticion])
  const patch = useCallback((e, body) => peticion(e, { method: 'PATCH', body }), [peticion])
  const del = useCallback((e) => peticion(e, { method: 'DELETE' }), [peticion])
  // Sube un File al endpoint indicado en un campo "file" (multipart/form-data).
  const upload = useCallback(
    (e, file) => {
      const fd = new FormData()
      fd.append('file', file)
      return peticion(e, { method: 'POST', body: fd })
    },
    [peticion],
  )

  return { peticion, get, post, patch, del, upload, cargando, error }
}
