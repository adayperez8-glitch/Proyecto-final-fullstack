// URL base del backend. Configurable por entorno (ver .env / .env.production).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default API_URL
