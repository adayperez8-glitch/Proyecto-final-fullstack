import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB (suficiente para vídeos cortos de historia)

// Solo imágenes y vídeos. El tipo se decide a partir del mimetype.
function fileFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true)
  } else {
    cb(ApiError.badRequest('Solo se permiten imágenes o vídeos'))
  }
}

// Middleware para subir un único archivo en el campo "file". Guardamos el
// archivo en memoria (buffer) y lo persiste lib/storage.js (Cloudinary o disco).
export const uploadStoryMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES },
}).single('file')
