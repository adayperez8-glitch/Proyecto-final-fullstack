import { ApiError } from '../utils/ApiError.js'

// Valida req[source] con un schema de zod. En éxito, sustituye los datos por
// la versión parseada/saneada. En error, lanza 400 con el detalle por campo.
// Nota: en Express 5 req.query es de solo lectura, por eso lo guardamos aparte.
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        campo: i.path.join('.') || '(raíz)',
        mensaje: i.message,
      }))
      return next(ApiError.badRequest('Datos inválidos', details))
    }
    if (source === 'query') {
      req.validatedQuery = result.data
    } else {
      req[source] = result.data
    }
    next()
  }
