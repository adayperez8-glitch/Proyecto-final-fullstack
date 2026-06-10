import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { commentDTO } from '../../utils/serializers.js'
import { notifyFriendsOf } from '../../lib/events.js'

export async function addComment(req, res) {
  const { sessionId, text } = req.body
  const session = await prisma.focusSession.findUnique({ where: { id: sessionId } })
  if (!session) throw ApiError.notFound('Sesión no encontrada')

  const comment = await prisma.comment.create({
    data: { sessionId, fromId: req.user.id, text },
  })
  // El comentario flota sobre la cuenta atrás del dueño: aviso a su círculo.
  notifyFriendsOf(session.userId, 'feed', { kind: 'comment' })
  res.status(201).json({ comentario: commentDTO({ ...comment, from: req.user }) })
}

export async function removeComment(req, res) {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } })
  if (!comment) throw ApiError.notFound('Comentario no encontrado')
  if (comment.fromId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('No puedes borrar este comentario')
  }
  await prisma.comment.delete({ where: { id: comment.id } })
  res.json({ ok: true })
}
