import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Recuperamos la sesión guardada al cargar la app.
  useEffect(() => {
    const token = localStorage.getItem('token')
    const guardado = localStorage.getItem('usuario')
    if (token && guardado) {
      try {
        setUsuario(JSON.parse(guardado))
      } catch {
        localStorage.removeItem('usuario')
      }
    }
    setCargando(false)
  }, [])

  const login = (datosUsuario, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(datosUsuario))
    setUsuario(datosUsuario)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  // Para reflejar cambios de perfil sin tener que volver a loguear.
  const actualizarUsuario = (parciales) => {
    setUsuario((prev) => {
      const next = { ...prev, ...parciales }
      localStorage.setItem('usuario', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
