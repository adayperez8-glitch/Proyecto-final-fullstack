import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { computeEndsAt } from '../src/utils/countdown.js'

const prisma = new PrismaClient()
const minutesAgo = (m) => new Date(Date.now() - m * 60_000)

async function main() {
  // Limpieza (solo para desarrollo). El orden respeta las relaciones.
  await prisma.message.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.story.deleteMany()
  await prisma.mood.deleteMany()
  await prisma.focusSession.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // ── Usuarios ──────────────────────────────────────────────────
  const [ada, linus, grace, alan, margaret] = await Promise.all(
    [
      { username: 'ada', displayName: 'Ada Lovelace', role: 'ADMIN', bio: 'Primera programadora 👩‍💻' },
      { username: 'linus', displayName: 'Linus T.', bio: 'Kernel & café' },
      { username: 'grace', displayName: 'Grace Hopper', bio: 'Compilando sueños' },
      { username: 'alan', displayName: 'Alan Turing', bio: 'Máquinas que piensan' },
      { username: 'margaret', displayName: 'Margaret H.', bio: 'Apollo guidance 🚀' },
    ].map((u) =>
      prisma.user.create({
        data: { ...u, email: `${u.username}@brote.app`, passwordHash },
      }),
    ),
  )

  // Usuario-bot de la automatización N8N: firma el MD de felicitación
  // que llega al completar una sesión de foco.
  await prisma.user.create({
    data: {
      username: 'brote',
      displayName: 'Brote 🌱',
      email: 'brote@brote.app',
      passwordHash,
      bio: 'Tu compañero de foco. Te felicito cuando completas una sesión 🌱',
    },
  })

  // ── Sesiones de foco en distintos puntos del countdown ────────
  const sBig = await prisma.focusSession.create({
    data: {
      userId: ada.id,
      type: 'STUDY',
      goalMinutes: 480, // 8h, recién empezada → rojo
      startedAt: minutesAgo(45),
      endsAt: computeEndsAt(minutesAgo(45), 480),
      status: 'ACTIVE',
    },
  })
  await prisma.focusSession.create({
    data: {
      userId: linus.id,
      type: 'WORK',
      goalMinutes: 120, // mitad → ámbar
      startedAt: minutesAgo(60),
      endsAt: computeEndsAt(minutesAgo(60), 120),
      status: 'ACTIVE',
    },
  })
  await prisma.focusSession.create({
    data: {
      userId: grace.id,
      type: 'STUDY',
      goalMinutes: 90, // casi terminando → verdoso
      startedAt: minutesAgo(80),
      endsAt: computeEndsAt(minutesAgo(80), 90),
      status: 'ACTIVE',
    },
  })
  await prisma.focusSession.create({
    data: {
      userId: alan.id,
      type: 'WORK',
      goalMinutes: 60, // completada → verde
      startedAt: minutesAgo(75),
      endsAt: computeEndsAt(minutesAgo(75), 60),
      status: 'COMPLETED',
      completedAt: minutesAgo(15),
    },
  })

  // ── Estados de ánimo ──────────────────────────────────────────
  const moods = {}
  for (const [user, mood, note] of [
    [ada, 'MOTIVADO', '¡Hoy sí saco el proyecto final!'],
    [linus, 'CONCENTRADO', 'En la zona 🎧'],
    [grace, 'CANSADO', 'Pero queda poco 💪'],
    [alan, 'ENERGICO', null],
    [margaret, 'ANSIOSO', 'Examen mañana...'],
  ]) {
    moods[user.id] = await prisma.mood.create({
      data: { userId: user.id, mood, note },
    })
  }

  // ── Historias (24h) ───────────────────────────────────────────
  const storyGrace = await prisma.story.create({
    data: {
      userId: grace.id,
      text: 'Maratón de estudio hasta acabar el tema 7 📚',
      bgColor: '#e8c5b8',
      expiresAt: computeEndsAt(new Date(), 60 * 20),
    },
  })
  await prisma.story.create({
    data: {
      userId: linus.id,
      imageUrl: 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?w=800',
      expiresAt: computeEndsAt(new Date(), 60 * 20),
    },
  })

  // ── Comentarios flotantes sobre la sesión de Ada ──────────────
  await prisma.comment.createMany({
    data: [
      { sessionId: sBig.id, fromId: linus.id, text: '¡Tú puedes con esas 8h! 🔥' },
      { sessionId: sBig.id, fromId: grace.id, text: 'Vamos Ada 💜' },
    ],
  })

  // ── Reacciones de apoyo a estados de ánimo ────────────────────
  await prisma.reaction.createMany({
    data: [
      { moodId: moods[margaret.id].id, fromId: ada.id, emoji: '💪', text: '¡Ánimo con el examen!' },
      { moodId: moods[grace.id].id, fromId: alan.id, emoji: '❤️' },
    ],
  })

  // ── Mensajes: un MD privado y una respuesta pública a historia ─
  await prisma.message.create({
    data: { fromId: ada.id, toId: linus.id, text: '¿Sesión conjunta esta tarde?', visibility: 'PRIVATE' },
  })
  await prisma.message.create({
    data: {
      fromId: alan.id,
      toId: grace.id,
      storyId: storyGrace.id,
      text: '¡A por el tema 7! 🙌',
      visibility: 'PUBLIC',
    },
  })

  // ── Amistades (mutuas, dos filas por pareja) ──────────────────
  // ada↔linus, ada↔grace, linus↔alan, linus↔margaret, grace↔margaret, alan↔margaret.
  // Así, para ada (amiga de linus y grace) las recomendaciones son:
  // margaret (2 en común: linus y grace) y alan (1 en común: linus).
  const parejas = [
    [ada, linus],
    [ada, grace],
    [linus, alan],
    [linus, margaret],
    [grace, margaret],
    [alan, margaret],
  ]
  await prisma.friendship.createMany({
    data: parejas.flatMap(([a, b]) => [
      { userId: a.id, friendId: b.id },
      { userId: b.id, friendId: a.id },
    ]),
  })

  console.log('🌱 Seed completado: 5 usuarios (admin: ada). Contraseña de todos: password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
