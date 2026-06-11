import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { reactionDTO } from '../../utils/serializers.js'
import { notifyFriendsOf } from '../../lib/events.js'

// Usuario-bot que firma los mensajes de apoyo del coach de ánimo.
// Se cachea tras la primera búsqueda (no cambia en tiempo de ejecución).
let botUserPromise
function getBotUser() {
  if (!botUserPromise) {
    botUserPromise = prisma.user.findUnique({ where: { username: 'brote' } })
  }
  return botUserPromise
}

// Borra las historias cuyo plazo de 24h ya expiró. La llama por cron el
// workflow "limpieza de historias" de N8N. Devuelve cuántas borró para que
// el nodo IF de N8N pueda ramificar (p.ej. notificar solo si borró algo).
export async function cleanupStories(_req, res) {
  const { count } = await prisma.story.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  res.json({ deleted: count, at: new Date().toISOString() })
}

// Crea la reacción de apoyo del bot sobre un ánimo. La llama el workflow
// "coach de ánimo" de N8N una vez ha generado el texto (IA o plantilla).
export async function coachReaction(req, res) {
  const { moodId, emoji, text } = req.body

  const mood = await prisma.mood.findUnique({ where: { id: moodId } })
  if (!mood) throw ApiError.notFound('Estado de ánimo no encontrado')

  const bot = await getBotUser()
  if (!bot) throw ApiError.notFound('Usuario-bot "brote" no existe (¿ejecutaste el seed?)')

  const reaction = await prisma.reaction.create({
    data: { moodId, fromId: bot.id, emoji, text },
    include: { from: true },
  })
  // Empuja el mensaje del coach en tiempo real al dueño del ánimo (y amigos).
  notifyFriendsOf(mood.userId, 'feed', { kind: 'reaction' })
  res.status(201).json({ reaccion: reactionDTO(reaction) })
}
