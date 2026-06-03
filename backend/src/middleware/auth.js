import { verifyToken } from '../services/token.js'
import { ApiError } from '../utils/ApiError.js'
import { prisma } from '../lib/prisma.js'

// Verifica el JWT del header Authorization: Bearer <token> y carga el usuario.
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw ApiError.unauthorized('Falta el token de autenticación')

    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw ApiError.unauthorized('Usuario no encontrado')

    // Refrescamos la presencia sin bloquear la petición.
    prisma.user
      .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {})

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token inválido o expirado'))
    }
    next(err)
  }
}

// Restringe una ruta a ciertos roles (p.ej. requireRole('ADMIN')).
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('No tienes permisos para esta acción'))
    }
    next()
  }
}
