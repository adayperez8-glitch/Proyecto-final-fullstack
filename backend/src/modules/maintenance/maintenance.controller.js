import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { messageDTO } from '../../utils/serializers.js'
import { sendToUser } from '../../lib/events.js'

// Usuario-bot que firma las felicitaciones de la automatización.
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
// el nodo IF de N8N pueda ramificar (p.ej. registrar solo si borró algo).
export async function cleanupStories(_req, res) {
  const { count } = await prisma.story.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  res.json({ deleted: count, at: new Date().toISOString() })
}

// Crea el MD de felicitación del bot Brote. Lo llama el workflow
// "felicitación de sesión" de N8N cuando alguien completa su cuenta atrás.
// El mensaje le llega al usuario en vivo (SSE), como cualquier otro MD.
export async function sessionCongrats(req, res) {
  const { userId, text } = req.body

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('Usuario no encontrado')

  const bot = await getBotUser()
  if (!bot) throw ApiError.notFound('Usuario-bot "brote" no existe (¿ejecutaste el seed?)')

  const message = await prisma.message.create({
    data: { fromId: bot.id, toId: userId, text, visibility: 'PRIVATE' },
    include: { from: true, to: true },
  })
  sendToUser(userId, 'message', { fromId: bot.id })
  res.status(201).json({ mensaje: messageDTO(message) })
}
