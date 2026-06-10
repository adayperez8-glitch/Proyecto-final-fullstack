import 'dotenv/config'

// En producción el secreto JWT es obligatorio: arrancar con el valor de
// desarrollo firmaría tokens adivinables. Mejor fallar alto y claro.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET: es obligatorio en producción')
}

// Configuración centralizada leída de variables de entorno.
// Nada sensible vive en el código fuente (ver .env.example).
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Clave para los endpoints internos que llaman las automatizaciones (N8N).
  // No es JWT de usuario: se valida con la cabecera x-api-key.
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  // Coach de ánimo: webhook de N8N al que avisamos cuando alguien fija su ánimo.
  coach: {
    webhookUrl: process.env.MOOD_COACH_WEBHOOK_URL || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Brote <hola@brote.app>',
  },
}
