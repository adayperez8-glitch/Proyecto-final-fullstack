import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { moodDTO } from '../../utils/serializers.js'
import { moodCategory, isPositive, isSameDay } from '../../utils/mood.js'
import { notifyMoodCoach } from '../../services/coach.js'
import { notifyFriendsOf } from '../../lib/events.js'

// Registra el ánimo del usuario. El "ánimo de hoy" es siempre el más reciente.
export async function setMood(req, res) {
  const { mood, note } = req.body
  const created = await prisma.mood.create({ data: { userId: req.user.id, mood, note } })

  // Ánimo anterior del usuario, para que el coach pueda decir cosas como
  // "ayer estabas bien, recuperemos ese ánimo". Se busca el último ánimo de un
  // día ANTERIOR a hoy: si hoy ya registraste otro, ese no cuenta como "ayer"
  // (si no, registrar dos ánimos el mismo día taparía siempre el de ayer).
  const inicioDeHoy = new Date(created.createdAt)
  inicioDeHoy.setHours(0, 0, 0, 0)
  const previous = await prisma.mood.findFirst({
    where: { userId: req.user.id, createdAt: { lt: inicioDeHoy } },
    orderBy: { createdAt: 'desc' },
  })

  // Disparo no bloqueante del workflow de N8N. Avisamos siempre; es el propio
  // workflow quien decide (Switch/IF) si actúa y con qué mensaje.
  notifyMoodCoach({
    userId: req.user.id,
    displayName: req.user.displayName,
    email: req.user.email,
    moodId: created.id,
    mood: created.mood,
    moodNote: created.note,
    category: moodCategory(created.mood),
    previousMood: previous?.mood ?? null,
    previousWasPositive: previous ? isPositive(previous.mood) : false,
    previousWasEarlierDay: previous ? !isSameDay(previous.createdAt, created.createdAt) : false,
  }).catch(() => {})

  notifyFriendsOf(req.user.id, 'feed', { kind: 'mood' })
  res.status(201).json({ mood: moodDTO({ ...created, user: req.user }) })
}

export async function myMood(req, res) {
  // Incluye las reacciones para que el dueño vea los apoyos (y el mensaje del
  // coach de N8N) sobre su propio ánimo en el feed.
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
