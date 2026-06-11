import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { moodDTO } from '../../utils/serializers.js'
import { notifyFriendsOf } from '../../lib/events.js'

// Registra el ánimo del usuario. El "ánimo de hoy" es siempre el más reciente.
export async function setMood(req, res) {
  const { mood, note } = req.body
  const created = await prisma.mood.create({ data: { userId: req.user.id, mood, note } })

  notifyFriendsOf(req.user.id, 'feed', { kind: 'mood' })
  res.status(201).json({ mood: moodDTO({ ...created, user: req.user }) })
}

export async function myMood(req, res) {
  // Incluye las reacciones para que el dueño vea los apoyos recibidos
  // sobre su propio ánimo en el feed.
  const mood = await prisma.mood.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { reactions: { include: { from: true }, orderBy: { createdAt: 'desc' } } },
  })
  res.json({ mood: mood ? moodDTO({ ...mood, user: req.user }) : null })
}

export async function getOne(req, res) {
  const mood = await prisma.mood.findUnique({
    where: { id: req.params.id },
    include: { user: true, reactions: { include: { from: true }, orderBy: { createdAt: 'desc' } } },
  })
  if (!mood) throw ApiError.notFound('Estado de ánimo no encontrado')
  res.json({ mood: moodDTO(mood) })
}
