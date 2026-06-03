// Error operacional con código HTTP. El middleware central lo convierte en respuesta JSON.
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details)
  }
  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, message)
  }
  static forbidden(message = 'Acceso denegado') {
    return new ApiError(403, message)
  }
  static notFound(message = 'No encontrado') {
    return new ApiError(404, message)
  }
  static conflict(message) {
    return new ApiError(409, message)
  }
}
