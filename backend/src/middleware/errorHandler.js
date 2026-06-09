import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'

// 404 para rutas no registradas.
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`))
}

// Manejo de errores CENTRALIZADO. Único lugar que da formato a las respuestas de error.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Traducimos errores conocidos de Prisma a códigos HTTP apropiados.
  if (err.code === 'P2002') {
    const fields = err.meta?.target?.join(', ') || 'campo'
    err = ApiError.conflict(`Ya existe un registro con ese ${fields}`)
  } else if (err.code === 'P2025') {
    err = ApiError.notFound('Registro no encontrado')
  } else if (err.name === 'MulterError') {
    // Errores de subida (multer): tamaño excedido, campo inesperado, etc.
    const msg =
      err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo (50 MB)' : err.message
    err = ApiError.badRequest(msg)
  }

  const statusCode = err.statusCode || 500
  const payload = { error: err.message || 'Error interno del servidor' }
  if (err.details) payload.details = err.details
  if (statusCode >= 500) {
    console.error('💥 Error no controlado:', err)
    if (!env.isProd) payload.stack = err.stack
  }

  res.status(statusCode).json(payload)
}
