import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { computeEndsAt } from '../../utils/countdown.js'
import { sessionDTO, moodDTO } from '../../utils/serializers.js'
import { sendEmail, emails } from '../../services/email.js'
import { notifySessionCompleted } from '../../services/n8n.js'
import { friendIdsOf, areFriends } from '../../lib/friendships.js'
import { notifyFriendsOf } from '../../lib/events.js'

const DAY_MS = 24 * 60 * 60 * 1000
// Margen de cortesía para "completar": cubre la deriva de reloj entre el
// navegador y el servidor, sin permitir completar una sesión a medias.
const EARLY_COMPLETE_MARGIN_MS = 30 * 1000
const commentsInclude = {
  comments: { include: { from: true }, orderBy: { createdAt: 'desc' }, take: 20 },
}

// Inicia una sesión de foco. Solo se permite una activa a la vez por usuario.
export async function startSession(req, res) {
  const { type, goalMinutes } = req.body

  const active = await prisma.focusSession.findFirst({
    where: { userId: req.user.id, status: 'ACTIVE' },
  })
  if (active) {
    throw ApiError.conflict('Ya tienes una sesión activa. Termínala o cancélala antes de empezar otra.')
  }

  const startedAt = new Date()
  const endsAt = computeEndsAt(startedAt, goalMinutes)
  const session = await prisma.focusSession.create({
    data: { userId: req.user.id, type, goalMinutes, startedAt, endsAt },
  })

  notifyFriendsOf(req.user.id, 'feed', { kind: 'session' })
  res.status(201).json({ sesion: sessionDTO({ ...session, user: req.user }) })
}

// Feed principal: quién está (o estuvo hoy) en una sesión, con su ánimo y si tiene historia.
export async function feed(req, res) {
  const since = new Date(Date.now() - DAY_MS)

  // Solo se ven enfocados los amigos (y la propia sesión); nada de desconocidos.
  const visibles = [...(await friendIdsOf(req.user.id)), req.user.id]

  const sessions = await prisma.focusSession.findMany({
    where: {
      userId: { in: visibles },
      startedAt: { gte: since },
      status: { not: 'CANCELLED' },
    },
    include: { user: true, ...commentsInclude },
    orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
  })

  const userIds = [...new Set(sessions.map((s) => s.userId))]

  // Último ánimo de cada usuario, con sus reacciones de apoyo (para el contador).
  // distinct trae UNA fila por usuario (la más reciente, por el orderBy), en
  // lugar de cargar todo el historial de ánimos para quedarnos con la primera.
  const moods = await prisma.mood.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
    include: { reactions: { include: { from: true } } },
  })
  const moodByUser = new Map(moods.map((m) => [m.userId, m]))

  // Usuarios con historia activa (no expirada).
  const stories = await prisma.story.findMany({
    where: { userId: { in: userIds }, expiresAt: { gt: new Date() } },
    select: { userId: true },
  })
  const hasStory = new Set(stories.map((s) => s.userId))

  const items = sessions.map((s) => ({
    ...sessionDTO(s),
    mood: moodByUser.has(s.userId) ? moodDTO(moodByUser.get(s.userId)) : null,
    hasStory: hasStory.has(s.userId),
  }))

  res.json({ feed: items })
}

// Mi sesión activa (o null).
export async function myActive(req, res) {
  const session = await prisma.focusSession.findFirst({
    where: { userId: req.user.id, status: 'ACTIVE' },
    include: commentsInclude,
  })
  res.json({ sesion: session ? sessionDTO({ ...session, user: req.user }) : null })
}

export async function getOne(req, res) {
  const session = await prisma.focusSession.findUnique({
    where: { id: req.params.id },
    include: { user: true, comments: { include: { from: true }, orderBy: { createdAt: 'desc' } } },
  })
  if (!session) throw ApiError.notFound('Sesión no encontrada')
  // Misma regla de privacidad que el feed: solo amigos (o el dueño).
  if (!(await areFriends(req.user.id, session.userId))) {
    throw ApiError.forbidden('Solo los amigos pueden ver esta sesión')
  }
  res.json({ sesion: sessionDTO(session) })
}

async function endSession(req, status, sendMail) {
  const session = await prisma.focusSession.findUnique({ where: { id: req.params.id } })
  if (!session) throw ApiError.notFound('Sesión no encontrada')
  if (session.userId !== req.user.id) throw ApiError.forbidden('Esta sesión no es tuya')
  if (session.status !== 'ACTIVE') throw ApiError.badRequest('La sesión ya no está activa')

  // Completar exige que la cuenta atrás haya llegado (casi) a cero: sin esto,
  // cualquiera "florecería" una sesión de 8h en 10 segundos y las rachas y
  // estadísticas serían trucables. Cancelar sí se permite en cualquier momento.
  if (status === 'COMPLETED' && session.endsAt.getTime() - Date.now() > EARLY_COMPLETE_MARGIN_MS) {
    throw ApiError.badRequest(
      'La sesión aún no ha terminado. Espera a que la cuenta atrás llegue a cero o cancélala.',
    )
  }

  const updated = await prisma.focusSession.update({
    where: { id: session.id },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  })

  // Al terminar (completar o cancelar) la sesión, las reacciones de apoyo sobre
  // el ánimo del usuario se reinician: desaparecen y el contador vuelve a 0.
  await prisma.reaction.deleteMany({ where: { mood: { userId: req.user.id } } })

  if (sendMail) {
    sendEmail(emails.sessionCompleted(req.user, updated)).catch((e) =>
      console.error('email sesión:', e.message),
    )
  }
  // Automatización N8N: al COMPLETAR, el workflow felicita con un MD del bot
  // Brote (Switch estudio/trabajo). Fire-and-forget, igual que el email.
  if (status === 'COMPLETED') {
    notifySessionCompleted({
      userId: req.user.id,
      displayName: req.user.displayName,
      type: updated.type,
      goalMinutes: updated.goalMinutes,
    }).catch(() => {})
  }
  notifyFriendsOf(req.user.id, 'feed', { kind: 'session' })
  return sessionDTO({ ...updated, user: req.user })
}

export async function complete(req, res) {
  res.json({ sesion: await endSession(req, 'COMPLETED', true) })
}

export async function cancel(req, res) {
  res.json({ sesion: await endSession(req, 'CANCELLED', false) })
}
