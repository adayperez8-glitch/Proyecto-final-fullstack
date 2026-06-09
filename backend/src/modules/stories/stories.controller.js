import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { storyDTO } from '../../utils/serializers.js'

const DAY_MS = 24 * 60 * 60 * 1000

// Borra las historias que ya pasaron de las 24 h. Se llama de forma perezosa al
// leer/crear historias para que caduquen solas sin depender de la automatización.
async function purgeExpired() {
  await prisma.story.deleteMany({ where: { expiresAt: { lte: new Date() } } })
}

// Sube un archivo (foto o vídeo) desde la galería y devuelve su URL pública.
// El frontend luego crea la historia con esa URL en POST /api/stories.
export async function uploadMedia(req, res) {
  if (!req.file) throw ApiError.badRequest('No se recibió ningún archivo')
  const mediaType = req.file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE'
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  res.status(201).json({ url, mediaType })
}

export async function createStory(req, res) {
  await purgeExpired()
  const { imageUrl, text, bgColor, mediaType } = req.body
  const story = await prisma.story.create({
    data: {
      userId: req.user.id,
      imageUrl,
      mediaType: imageUrl ? mediaType || 'IMAGE' : null,
      text,
      bgColor,
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  })
  res.status(201).json({ historia: storyDTO({ ...story, user: req.user }) })
}

// Historias activas (no expiradas) de todos, para la barra de historias.
export async function feed(_req, res) {
  await purgeExpired()
  const stories = await prisma.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ historias: stories.map(storyDTO) })
}

export async function getOne(req, res) {
  const story = await prisma.story.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      // respuestas públicas (mensajes flotantes que todos pueden ver)
      messages: {
        where: { visibility: 'PUBLIC' },
        include: { from: true, to: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  // Una historia caducada (>24 h) se trata como inexistente.
  if (!story || story.expiresAt <= new Date()) throw ApiError.notFound('Historia no encontrada')
  res.json({ historia: storyDTO(story) })
}

export async function remove(req, res) {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } })
  if (!story) throw ApiError.notFound('Historia no encontrada')
  if (story.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('No puedes borrar esta historia')
  }
  await prisma.story.delete({ where: { id: story.id } })
  res.json({ ok: true })
}
