// URL base del microservicio de IA (FastAPI). En local apunta al servicio
// Python; en producción, a su URL desplegada. Es independiente del backend Node.
const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

export default AI_URL
