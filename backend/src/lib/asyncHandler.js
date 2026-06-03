// Envuelve un handler async para reenviar cualquier error al middleware central.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
