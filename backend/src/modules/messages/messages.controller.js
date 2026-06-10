import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { messageDTO } from '../../utils/serializers.js'
import { sendToUser } from '../../lib/events.js'

export async function send(req, res) {
  const { toId, text, storyId, visibility } = req.body
  if (toId === req.user.id) throw ApiError.badRequest('No puedes enviarte un mensaje a ti mismo')

  const to = await prisma.user.findUnique({ where: { id: toId } })
  if (!to) throw ApiError.notFound('Destinatario no encontrado')

  if (storyId) {
    const story = await prisma.story.findUnique({ where: { id: storyId } })
    if (!story) throw ApiError.notFound('Historia no encontrada')
  }

  const message = await prisma.message.create({
    data: {
      fromId: req.user.id,
      toId,
      text,
      storyId: storyId || null,
      visibility: visibility || 'PRIVATE',
    },
  })

  // Aviso en tiempo real al destinatario (badge del sobre + hilo abierto).
  sendToUser(toId, 'message', { fromId: req.user.id })
  res.status(201).json({ mensaje: messageDTO({ ...message, from: req.user, to }) })
}

// Bandeja privada: MDs enviados y recibidos por el usuario, paginados del más
// reciente al más antiguo. `?before=<ISO>` trae la página anterior.
export async function inbox(req, res) {
  const limit = Math.min(Number(req.query.limit) || 100, 200)
  const before = req.query.before ? new Date(req.query.before) : null

  const messages = await prisma.message.findMany({
    where: {
      visibility: 'PRIVATE',
      OR: [{ toId: req.user.id }, { fromId: req.user.id }],
      ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
    },
    include: { from: true, to: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  res.json({ mensajes: messages.map(messageDTO), hayMas: messages.length === limit })
}

// Nº de MDs privados recibidos y aún sin leer (para el aviso de la navbar).
export async function unreadCount(req, res) {
  const count = await prisma.message.count({
    where: { toId: req.user.id, visibility: 'PRIVATE', readAt: null },
  })
  res.json({ count })
}

export async function markRead(req, res) {
  const message = await prisma.message.findUnique({ where: { id: req.params.id } })
  if (!message) throw ApiError.notFound('Mensaje no encontrado')
  if (message.toId !== req.user.id) throw ApiError.forbidden('Este mensaje no es para ti')

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { readAt: new Date() },
    include: { from: true, to: true },
  })
  res.json({ mensaje: messageDTO(updated) })
}
