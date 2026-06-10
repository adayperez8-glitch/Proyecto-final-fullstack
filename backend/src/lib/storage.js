import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

// Carpeta para el fallback a disco (desarrollo local sin Cloudinary).
// Se sirve de forma estática desde /uploads (ver app.js).
const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

// Si hay CLOUDINARY_URL, el SDK se configura solo desde esa variable y
// guardamos los archivos en Cloudinary (persisten aunque el server se reinicie).
// Si no, caemos a disco local (efímero en hosting, pero cómodo en desarrollo).
export const cloudinaryEnabled = Boolean(process.env.CLOUDINARY_URL)

function uploadToCloudinary(buffer, mediaType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'brote/historias',
        resource_type: mediaType === 'VIDEO' ? 'video' : 'image',
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url)),
    )
    stream.end(buffer)
  })
}

// La extensión se deriva del mimetype declarado, NUNCA del nombre original:
// un "foto.html" disfrazado de image/png se guardaría como .png y el estático
// jamás lo serviría como HTML (evita XSS alojado en /uploads).
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

function saveToDisk(file, mediaType, req) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
  const ext = EXT_BY_MIME[file.mimetype] || (mediaType === 'VIDEO' ? '.mp4' : '.jpg')
  const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`
  writeFileSync(join(UPLOADS_DIR, filename), file.buffer)
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`
}

// Persiste el archivo subido y devuelve { url, mediaType }.
export async function persistMedia(file, req) {
  const mediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE'
  const url = cloudinaryEnabled
    ? await uploadToCloudinary(file.buffer, mediaType)
    : saveToDisk(file, mediaType, req)
  return { url, mediaType }
}
