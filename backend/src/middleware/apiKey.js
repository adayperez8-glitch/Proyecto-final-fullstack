import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

// Protege los endpoints internos que llaman las automatizaciones (N8N).
// No usan JWT de usuario: se autentican con la cabecera `x-api-key`, que
// debe coincidir con INTERNAL_API_KEY. Si la clave no está configurada en el
// servidor, el endpoint queda deshabilitado por seguridad.
export function requireApiKey(req, _res, next) {
  if (!env.internalApiKey) {
    return next(ApiError.unauthorized('Endpoint interno deshabilitado: falta INTERNAL_API_KEY'))
  }
  const key = req.headers['x-api-key']
  if (!key || key !== env.internalApiKey) {
    return next(ApiError.unauthorized('API key inválida'))
  }
  next()
}
