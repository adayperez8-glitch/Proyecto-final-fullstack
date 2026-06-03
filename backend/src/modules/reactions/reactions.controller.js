import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { reactionDTO } from '../../utils/serializers.js'

export async function addReaction(req, res) {
  const { moodId, emoji, text } = req.body
  const mood = await prisma.mood.findUnique({ where: { id: moodId } })
  if (!mood) throw ApiError.notFound('Estado de ánimo no encontrado')

  const reaction = await prisma.reaction.create({
    data: { moodId, fromId: req.user.id, emoji, text },
  })
  res.status(201).json({ reaccion: reactionDTO({ ...reaction, from: req.user }) })
}

export async function removeReaction(req, res) {
  const reaction = await prisma.reaction.findUnique({ where: { id: req.params.id } })
  if (!reaction) throw ApiError.notFound('Reacción no encontrada')
  if (reaction.fromId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('No puedes borrar esta reacción')
  }
  await prisma.reaction.delete({ where: { id: reaction.id } })
  res.json({ ok: true })
}
