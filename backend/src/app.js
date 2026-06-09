import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import api from './routes.js'
import { UPLOADS_DIR } from './lib/storage.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// Crea la app Express. Separada del arranque del servidor para poder testearla con supertest.
export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.corsOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'brote-api' }))

  // Archivos subidos (fotos/vídeos de historias). Servidos con CORP cross-origin
  // para que el frontend (otro puerto en local) pueda cargarlos en <img>/<video>.
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  )

  app.use('/api', api)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
