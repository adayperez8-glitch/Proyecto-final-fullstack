import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { messageDTO } from '../../utils/serializers.js'

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
  res.status(201).json({ mensaje: messageDTO({ ...message, from: req.user, to }) })
}

// Bandeja privada: MDs enviados y recibidos por el usuario.
export async function inbox(req, res) {
  const messages = await prisma.message.findMany({
    where: { visibility: 'PRIVATE', OR: [{ toId: req.user.id }, { fromId: req.user.id }] },
    include: { from: true, to: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ mensajes: messages.map(messageDTO) })
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
