import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'

// Carpeta donde se guardan los archivos subidos (fotos/vídeos de historias).
// Vive en backend/uploads y se sirve de forma estática desde /uploads (ver app.js).
const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB (suficiente para vídeos cortos de historia)

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // Nombre único e impredecible, conservando la extensión original.
    const ext = extname(file.originalname).toLowerCase().slice(0, 10)
    cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`)
  },
})

// Solo imágenes y vídeos. El tipo se decide a partir del mimetype.
function fileFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true)
  } else {
    cb(ApiError.badRequest('Solo se permiten imágenes o vídeos'))
  }
}

// Middleware para subir un único archivo en el campo "file".
export const uploadStoryMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES },
}).single('file')
