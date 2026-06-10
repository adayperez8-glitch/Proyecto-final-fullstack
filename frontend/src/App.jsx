import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Feed from './pages/Feed.jsx'
import Search from './pages/Search.jsx'
import Profile from './pages/Profile.jsx'
import Messages from './pages/Messages.jsx'
import Stats from './pages/Stats.jsx'
import Asistente from './pages/Asistente.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Zona privada: requiere sesión */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Feed />} />
        <Route path="/buscar" element={<Search />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/mensajes" element={<Messages />} />
        <Route path="/estadisticas" element={<Stats />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute soloAdmin>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
