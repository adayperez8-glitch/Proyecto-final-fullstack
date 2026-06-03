import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Cargando } from './ui/States.jsx'

// Protege rutas: exige sesión y, opcionalmente, rol de administrador.
export default function ProtectedRoute({ children, soloAdmin = false }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <Cargando label="Cargando Brote…" />
  if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />
  if (soloAdmin && usuario.role !== 'ADMIN') return <Navigate to="/" replace />

  return children
}
